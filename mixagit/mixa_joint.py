"""Joint nonlinear 1:1 repeat, reference and calibration inference.

Gaussian response terms and the population log-rate mean are integrated exactly.
Other parameters are sampled jointly, not fitted separately and averaged. This
module adds a distinct Bayesian analysis; it never edits a saved frequentist fit.
"""

from dataclasses import asdict, dataclass
import time

import numpy as np
import pandas as pd
from scipy import linalg, stats
from scipy.optimize import minimize
from scipy.special import ndtr, ndtri

from mixa_inference import review_problem
from mixa_input_uncertainty import collect_sources, common_options, interpolation_grid, whiten


REVISION = "2026-10-20.1"


@dataclass(frozen=True)
class JointPriors:
    kon_median: float = 1e5
    koff_median: float = .01
    population_log_sd: float = np.log(100.)
    between_log_sd_scale: float = 1.
    correlation_lkj_shape: float = 2.
    capacity_median: float = 100.
    capacity_log_sd: float = np.log(100.)
    baseline_sd: float = 100.
    drift_sd: float = 1.
    linear_background_sd: float = 1e7
    bulk_sd: float = 1e7
    noise_scale: float = 1.

    def validate(self):
        if not all(np.isfinite(v) and v > 0 for v in asdict(self).values()):
            raise ValueError("All joint-model prior scales and medians must be finite and positive.")


class JointNoise:
    """Exact linear subtraction covariance, including interpolation and reused IDs."""

    def __init__(self, curves, masks, options, objective_tau):
        self.slices, count = [], 0
        for mask in masks:
            n = int(np.count_nonzero(mask))
            self.slices.append(slice(count, count+n))
            count += n
        if count > 4096:
            raise ValueError("Joint inference supports at most 4096 selected-plus-baseline observations; trim/downsample explicitly before this analysis.")
        self.n, self.logdet, self.blocks = count, 0., []
        self.metadata = []
        if not options["propagate_measurement"]:
            for c, mask, s in zip(curves, masks, self.slices):
                t, sd = np.asarray(c["time"])[mask], c.get("relative_sd", 1.)
                self.blocks.append(dict(index=np.arange(s.start, s.stop), time=t, sd=sd, tau=objective_tau))
                self.logdet += 2*len(t)*np.log(sd)
                if objective_tau > 0:
                    self.logdet += np.log(-np.expm1(-2*np.diff(t)/objective_tau)).sum()
            return
        sources, self.metadata = collect_sources(curves, options)
        # Connected reference graphs are independent covariance blocks.
        parent = list(range(len(curves)))

        def root(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        owners = {}
        for i, c in enumerate(curves):
            for term in c["measurement_sources"]:
                key = term["id"]
                if key in owners:
                    parent[root(i)] = root(owners[key])
                else:
                    owners[key] = i
        for group in sorted({root(i) for i in range(len(curves))}):
            members = [i for i in range(len(curves)) if root(i) == group]
            index = np.concatenate([np.arange(self.slices[i].start, self.slices[i].stop) for i in members])
            covariance = np.zeros((len(index), len(index)))
            maps, pos = {}, 0
            for i in members:
                c, mask = curves[i], masks[i]
                q, n = np.asarray(c["time"])[mask], int(np.count_nonzero(mask))
                for term in c["measurement_sources"]:
                    key, source = term["id"], sources[term["id"]]
                    if key not in maps:
                        maps[key] = np.zeros((len(index), len(source["time"])))
                    left, right, fraction = interpolation_grid(source["time"], q)
                    rows, weight = np.arange(pos, pos+n), term["weight"]*c.get("response_sign", 1.)
                    np.add.at(maps[key], (rows, left), weight*(1-fraction))
                    np.add.at(maps[key], (rows, right), weight*fraction)
                pos += n
            for key, matrix in maps.items():
                source, tau = sources[key], options["raw_correlation_time_s"]
                if tau > 0:
                    kernel = np.exp(-np.abs(source["time"][:, None]-source["time"][None, :])/tau)
                    covariance += source["sd"]**2*((matrix @ kernel) @ matrix.T)
                else:
                    covariance += source["sd"]**2*(matrix @ matrix.T)
            try:
                chol = linalg.cholesky(covariance, lower=True, check_finite=False)
            except linalg.LinAlgError as exc:
                raise ValueError("Joint raw-source covariance is singular; independent sample noise and consistent provenance are required.") from exc
            self.blocks.append(dict(index=index, chol=chol))
            self.logdet += 2*np.log(np.diag(chol)).sum()

    def apply(self, values):
        values = np.asarray(values, float)
        output = np.empty_like(values)
        for block in self.blocks:
            index = block["index"]
            if "chol" in block:
                output[index] = linalg.solve_triangular(block["chol"], values[index], lower=True, check_finite=False)
            else:
                selected = values[index]
                output[index] = whiten(selected.T, block["time"], block["tau"]).T/block["sd"]
        return output

    def adjoint(self, values):
        values = np.asarray(values, float)
        output = np.empty_like(values)
        for block in self.blocks:
            index = block["index"]
            if "chol" in block:
                output[index] = linalg.solve_triangular(block["chol"].T, values[index], lower=False, check_finite=False)
            else:
                selected = values[index]/block["sd"]
                if block["tau"] > 0 and len(index) > 1:
                    alpha = np.exp(-np.diff(block["time"])/block["tau"])
                    innovations = selected[1:]/np.sqrt(-np.expm1(-2*np.diff(block["time"])/block["tau"]))
                    selected = np.r_[selected[0], innovations]
                    selected[:-1] -= alpha*innovations
                output[index] = selected
        return output

    def draw(self, rng, scale):
        output = np.empty(self.n)
        for block in self.blocks:
            index = block["index"]
            z = rng.normal(size=len(index))
            if "chol" in block:
                output[index] = scale*(block["chol"] @ z)
            else:
                if block["tau"] > 0:
                    for i, dt in enumerate(np.diff(block["time"]), 1):
                        a = np.exp(-dt/block["tau"])
                        z[i] = a*z[i-1]+np.sqrt(-np.expm1(-2*dt/block["tau"]))*z[i]
                output[index] = scale*block["sd"]*z
        return output


def population_conditional(rates, covariance, priors):
    """Exact normal conditional for the true population mean, in log coordinates."""
    n = len(rates)
    precision = np.linalg.inv(covariance)
    prior_precision = np.eye(2)/priors.population_log_sd**2
    conditional_cov = np.linalg.inv(prior_precision+n*precision)
    prior_mean = np.log([priors.kon_median, priors.koff_median])
    conditional_mean = conditional_cov @ (prior_precision @ prior_mean+precision @ np.sum(rates, axis=0))
    return conditional_mean, conditional_cov


def rate_marginal_logpdf(rates, covariance, priors):
    """Integrate the population mean, not a plug-in two-stage rate estimate."""
    mean, n = rates.mean(axis=0), len(rates)
    residual = rates-mean
    sign, logdet = np.linalg.slogdet(covariance)
    if sign <= 0:
        return -np.inf
    mean_cov = np.eye(2)*priors.population_log_sd**2+covariance/n
    difference = mean-np.log([priors.kon_median, priors.koff_median])
    return float(-.5*((n-1)*logdet+np.einsum("ni,ij,nj->", residual, np.linalg.inv(covariance), residual)
                      +np.linalg.slogdet(mean_cov)[1]+difference @ np.linalg.solve(mean_cov, difference)))


def between_covariance(hyper):
    tau, rho = np.exp(hyper[:2]), np.tanh(hyper[2])
    return np.outer(tau, tau)*np.array([[1., rho], [rho, 1.]])


def interweave_rates(rates, old_covariance, new_covariance, priors):
    """Prior-preserving centered/noncentered map after integrating the mean.

    Mean and zero-sum deviations have independent Gaussian laws. Their Cholesky
    maps make the rate-density ratio cancel the transformation Jacobian exactly.
    """
    n, mean = len(rates), rates.mean(axis=0)
    prior_mean = np.log([priors.kon_median, priors.koff_median])
    prior_cov = np.eye(2)*priors.population_log_sd**2
    old_mean = linalg.cholesky(prior_cov+old_covariance/n, lower=True)
    new_mean = linalg.cholesky(prior_cov+new_covariance/n, lower=True)
    new_center = prior_mean+new_mean @ linalg.solve_triangular(old_mean, mean-prior_mean, lower=True)
    z = linalg.solve_triangular(linalg.cholesky(old_covariance, lower=True), (rates-mean).T, lower=True)
    return new_center+(linalg.cholesky(new_covariance, lower=True) @ z).T


class JointProblem:
    def __init__(self, result, priors=None, *, measurement_sd=None, include_baseline=True):
        self.saved = review_problem(result)
        if self.saved["model"] != "langmuir" or self.saved["transport"] != "None" or self.saved["nonspecific"]:
            raise ValueError("Joint repeat inference currently supports 1:1 without transport or a second binding population. The original advanced fit is retained.")
        self.priors = priors or JointPriors()
        self.priors.validate()
        self.curves, self.controls = self.saved["curves"], self.saved["controls"]
        self.repeats = sorted({str(c["repeat_id"]) for c in self.curves})
        if len(self.repeats) < 3:
            raise ValueError("Joint repeat inference requires at least three independent Repeat IDs, not technical replicates.")
        self.options = common_options(self.curves)
        if measurement_sd is not None and (not np.isfinite(measurement_sd) or measurement_sd <= 0):
            raise ValueError("Supply a finite positive measurement SD.")
        if measurement_sd is not None and self.options["propagate_measurement"]:
            raise ValueError("Raw-source covariance and an additional supplied measurement SD cannot both be used.")
        self.fixed_noise = measurement_sd
        self.masks = [np.asarray(c["fit_mask"], bool) | ((np.asarray(c["time"]) < c["on"]) if include_baseline else False)
                      for c in self.curves]
        if include_baseline and any(np.count_nonzero(np.asarray(c["time"])[m] < c["on"]) < 2 for c, m in zip(self.curves, self.masks)):
            raise ValueError("Include at least two measured pre-association points per curve, or explicitly disable their inclusion.")
        self.noise = JointNoise(self.curves, self.masks, self.options, self.saved["correlation_time"])
        self.response = np.concatenate([np.asarray(c["response"])[m]+c.get("baseline_offset", c.get("display_offset", 0.))
                                        for c, m in zip(self.curves, self.masks)])
        self.time = np.concatenate([np.asarray(c["time"])[m] for c, m in zip(self.curves, self.masks)])
        self.curve_index = np.concatenate([np.full(np.count_nonzero(m), i, int) for i, m in enumerate(self.masks)])
        self.repeat_index = np.array([self.repeats.index(str(c["repeat_id"])) for c in self.curves])
        self.levels = sorted({c["concentration_M"] for c in self.curves})
        self.level_index = np.array([self.levels.index(c["concentration_M"]) for c in self.curves])
        self.duration = np.concatenate([np.maximum(np.minimum(np.asarray(c["time"])[m], c["off"])-c["on"], 0.)
                                        for c, m in zip(self.curves, self.masks)])
        self.after = np.concatenate([np.maximum(np.asarray(c["time"])[m]-c["off"], 0.) for c, m in zip(self.curves, self.masks)])
        self.nominal = np.array([c["concentration_M"] for c in self.curves])
        self.capacity_keys = list(dict.fromkeys(c["_review_keys"]["Rmax"] for c in self.curves))
        self.free_capacity = [k for k in self.capacity_keys if not self.controls[k]["fixed"]]
        self.capacity_index = [self.capacity_keys.index(c["_review_keys"]["Rmax"]) for c in self.curves]
        free_cap_index = {key: i for i, key in enumerate(self.free_capacity)}
        self.free_capacity_rows = np.array([free_cap_index.get(self.curves[i]["_review_keys"]["Rmax"], -1) for i in self.curve_index])
        self.names, initial, low, high = [], [], [], []
        self.rate_bounds = []
        for repeat in self.repeats:
            for parameter in ["kon", "koff"]:
                keys = {c["_review_keys"][parameter] for c in self.curves if str(c["repeat_id"]) == repeat}
                if any(self.controls[k]["fixed"] for k in keys):
                    raise ValueError("Joint random rates cannot replace fixed kon/koff controls.")
                lower, upper = max(self.controls[k]["lower"] for k in keys), min(self.controls[k]["upper"] for k in keys)
                if lower >= upper:
                    raise ValueError("Saved per-repeat rate bounds have no common domain.")
                self.rate_bounds.append([np.log(lower), np.log(upper)])
                self.names.append(f"effective_{parameter}::{repeat}")
                initial.append(float(np.mean([np.log(self.controls[k]["value"]) for k in keys])))
                low.append(-np.inf)
                high.append(np.inf)
        self.n_rates = len(initial)
        self.capacity_start = self.n_rates
        for key in self.free_capacity:
            rule = self.controls[key]
            self.names.append(key)
            initial.append(np.log(rule["value"]))
            low.append(np.log(rule["lower"]))
            high.append(np.log(rule["upper"]))
        self.stock_index = None
        self.level_start = len(initial)
        self.level_sd = np.sqrt(np.log1p(self.options["level_cv"]**2))
        if self.level_sd:
            for level in self.levels:
                self.names.append(f"level_standard_normal::{level:.12g}")
                initial.append(0.)
                low.append(-np.inf)
                high.append(np.inf)
        self.stock_sd = np.sqrt(np.log1p(self.options["stock_cv"]**2))
        if self.stock_sd:
            self.stock_index = len(initial)
            self.names.append("stock_standard_normal")
            initial.append(0.)
            low.append(-np.inf)
            high.append(np.inf)
        self.noise_index = None
        if measurement_sd is None:
            self.noise_index = len(initial)
            self.names.append("log_noise_scale")
            sd = 1. if self.options["propagate_measurement"] else np.sqrt(self.saved["rss"]/(self.saved["n_observations"]-self.saved["n_parameters"]))
            initial.append(np.log(max(sd, 1e-10)))
            low.append(-np.inf)
            high.append(np.inf)
        self.initial, self.low, self.high = np.array(initial), np.array(low), np.array(high)
        self.rate_bounds = np.asarray(self.rate_bounds)
        self._linear_terms()
        self.white_response = self.noise.apply(self.response)
        self.observation_record = pd.DataFrame([dict(filename=c["filename"], repeat_id=c["repeat_id"],
            concentration_nM=c["concentration_nM"], kinetic_observations=int(np.count_nonzero(c["fit_mask"])),
            baseline_observations=int(np.count_nonzero(m & ~np.asarray(c["fit_mask"]))),
            undone_baseline_offset=c.get("baseline_offset", c.get("display_offset", 0.)))
            for c, m in zip(self.curves, self.masks)])

    def _linear_terms(self):
        columns, assignments, groups, fixed = [], [], [], []
        for i, (c, mask, span) in enumerate(zip(self.curves, self.masks, self.noise.slices)):
            t = np.asarray(c["time"])[mask]
            columns.append(np.zeros(self.noise.n))
            columns[-1][span] = 1.
            name = f"raw_baseline::{c['filename']}::{c['concentration_nM']:.12g}"
            groups.append(name)
            assignments.append((len(columns)-1, groups.index(name), self.priors.baseline_sd, i, False))
            for key, basis, sd in [
                ("drift", t-c["on"], self.priors.drift_sd),
                ("ns_linear", c["concentration_M"]*np.clip(t-c["on"], 0., c["off"]-c["on"]), self.priors.linear_background_sd),
                ("bulk", c["concentration_M"]*((t >= c["on"]) & (t < c["off"])), self.priors.bulk_sd),
            ]:
                instance = c["_review_keys"].get(key)
                if instance is None:
                    continue
                columns.append(np.zeros(self.noise.n))
                columns[-1][span] = basis
                calibrated = key != "drift"
                if self.controls[instance]["fixed"]:
                    fixed.append((len(columns)-1, self.controls[instance]["value"], i, calibrated))
                else:
                    if instance not in groups:
                        groups.append(instance)
                    assignments.append((len(columns)-1, groups.index(instance), sd, i, calibrated))
        matrix = np.column_stack(columns)
        white = self.noise.apply(matrix)
        u, singular, vt = np.linalg.svd(white, full_matrices=False)
        keep = singular > singular[0]*max(white.shape)*np.finfo(float).eps
        self.q, self.r = u[:, keep], singular[keep, None]*vt[keep]
        self.linear_assignments, self.linear_fixed = assignments, fixed
        self.linear_groups, self.linear_columns = groups, matrix
        self.constant_linear = not any(item[-1] for item in assignments+fixed)
        self._linear_cache = None
        if self.constant_linear:
            self._linear_cache = self._linear_system(np.ones(len(self.curves)))

    def calibration(self, core):
        stock = core[self.stock_index]*self.stock_sd if self.stock_index is not None else 0.
        levels = (core[self.level_start:self.level_start+len(self.levels)]*self.level_sd if self.level_sd
                  else np.zeros(len(self.levels)))
        return stock, levels

    def intrinsic_rates(self, core):
        rates = core[:self.n_rates].reshape(-1, 2).copy()
        rates[:, 0] -= self.calibration(core)[0]
        return rates

    def _linear_system(self, factors):
        design = np.zeros((self.r.shape[1], len(self.linear_groups)))
        mean = np.zeros(self.r.shape[1])
        for row, col, sd, curve, calibrated in self.linear_assignments:
            design[row, col] = sd*(factors[curve] if calibrated else 1.)
        for row, value, curve, calibrated in self.linear_fixed:
            mean[row] = value*(factors[curve] if calibrated else 1.)
        small = self.r @ design
        vectors, singular, _ = np.linalg.svd(small, full_matrices=True)
        eigenvalues = np.r_[singular**2, np.zeros(len(vectors)-len(singular))]
        return eigenvalues, vectors, self.r @ mean

    def prediction(self, core):
        stock, levels = self.calibration(core)
        effective = np.exp(core[:self.n_rates].reshape(-1, 2))
        on = effective[self.repeat_index, 0]*self.nominal*np.exp(levels[self.level_index])
        off = effective[self.repeat_index, 1]
        capacities = {key: self.controls[key]["value"] for key in self.capacity_keys}
        capacities.update({key: np.exp(core[self.capacity_start+j]) for j, key in enumerate(self.free_capacity)})
        capacity = np.array([capacities[self.capacity_keys[j]] for j in self.capacity_index])
        ix = self.curve_index
        total = on+off
        return capacity[ix]*(on/total)[ix]*(-np.expm1(-total[ix]*self.duration))*np.exp(-off[ix]*self.after)

    def prediction_jacobian(self, core):
        stock, levels = self.calibration(core)
        effective = np.exp(core[:self.n_rates].reshape(-1, 2))
        on = effective[self.repeat_index, 0]*self.nominal*np.exp(levels[self.level_index])
        off = effective[self.repeat_index, 1]
        prediction = self.prediction(core)
        capacities = {key: self.controls[key]["value"] for key in self.capacity_keys}
        capacities.update({key: np.exp(core[self.capacity_start+j]) for j, key in enumerate(self.free_capacity)})
        cap = np.array([capacities[self.capacity_keys[j]] for j in self.capacity_index])[self.curve_index]
        a, b = on[self.curve_index], off[self.curve_index]
        rate, tail = a+b, np.exp(-b*self.after)
        occupancy, exponential = -np.expm1(-rate*self.duration), self.duration*np.exp(-rate*self.duration)
        d_on = cap*tail*a*(b/rate**2*occupancy+a/rate*exponential)
        d_off = cap*tail*b*(-a/rate**2*occupancy+a/rate*exponential-a/rate*occupancy*self.after)
        jac = np.zeros((self.noise.n, len(core)))
        rows = np.arange(self.noise.n)
        repeat_rows = self.repeat_index[self.curve_index]
        jac[rows, 2*repeat_rows] = d_on
        jac[rows, 2*repeat_rows+1] = d_off
        for j in range(len(self.free_capacity)):
            mask = self.free_capacity_rows == j
            jac[mask, self.capacity_start+j] = prediction[mask]
        if self.level_sd:
            jac[rows, self.level_start+self.level_index[self.curve_index]] = self.level_sd*d_on
        return jac

    def likelihood(self, core, gradient=False):
        stock, levels = self.calibration(core)
        sigma = self.fixed_noise if self.noise_index is None else np.exp(core[self.noise_index])
        if not np.isfinite(sigma) or sigma <= 1e-100 or sigma > 1e100:
            return (-np.inf, np.zeros(len(core))) if gradient else -np.inf
        if self._linear_cache is None:
            if abs(stock) > 100 or np.max(np.abs(levels)) > 100:
                return (-np.inf, np.zeros(len(core))) if gradient else -np.inf
            eigenvalues, vectors, fixed = self._linear_system(np.exp(stock+levels[self.level_index]))
        else:
            eigenvalues, vectors, fixed = self._linear_cache
        residual = self.white_response-self.noise.apply(self.prediction(core))
        projection_raw = self.q.T @ residual
        projection = projection_raw-fixed
        orthogonal = residual-self.q @ projection_raw
        orthogonal_rss = float(orthogonal @ orthogonal)
        variance = sigma**2
        quadratic = orthogonal_rss/variance+np.sum((vectors.T @ projection)**2/(variance+eigenvalues))
        determinant = self.noise.logdet+self.noise.n*np.log(variance)+np.log1p(eigenvalues/variance).sum()
        lp = float(-.5*(quadratic+determinant+self.noise.n*np.log(2*np.pi)))
        if not gradient:
            return lp
        small_precision = (vectors/(variance+eigenvalues)) @ vectors.T
        small_u = small_precision @ projection
        u = orthogonal/variance+self.q @ small_u
        raw_u = self.noise.adjoint(u)
        effective = np.exp(core[:self.n_rates].reshape(-1, 2))
        a = effective[self.repeat_index, 0]*self.nominal*np.exp(levels[self.level_index])
        b = effective[self.repeat_index, 1]
        capacity = {key: self.controls[key]["value"] for key in self.capacity_keys}
        capacity.update({key: np.exp(core[self.capacity_start+j]) for j, key in enumerate(self.free_capacity)})
        cap = np.array([capacity[self.capacity_keys[j]] for j in self.capacity_index])[self.curve_index]
        ix, duration, after = self.curve_index, self.duration, self.after
        a, b = a[ix], b[ix]
        rate, off_factor = a+b, np.exp(-b*after)
        occupancy = -np.expm1(-rate*duration)
        exponential = duration*np.exp(-rate*duration)
        d_on = cap*off_factor*a*(b/rate**2*occupancy+a/rate*exponential)
        d_off = cap*off_factor*b*(-a/rate**2*occupancy+a/rate*exponential-a/rate*occupancy*after)
        g = np.zeros(len(core))
        repeat_rows = self.repeat_index[ix]
        for r in range(len(self.repeats)):
            mask = repeat_rows == r
            g[2*r], g[2*r+1] = d_on[mask] @ raw_u[mask], d_off[mask] @ raw_u[mask]
        pred = self.prediction(core)
        for j, key in enumerate(self.free_capacity):
            mask = self.free_capacity_rows == j
            g[self.capacity_start+j] = pred[mask] @ raw_u[mask]
        if self.level_sd:
            for j in range(len(self.levels)):
                mask = self.level_index[ix] == j
                g[self.level_start+j] = self.level_sd*(d_on[mask] @ raw_u[mask])
        if self._linear_cache is None:
            factors = np.exp(stock+levels[self.level_index])
            design = np.zeros((self.r.shape[1], len(self.linear_groups)))
            for row, col, sd, curve, calibrated in self.linear_assignments:
                design[row, col] = sd*(factors[curve] if calibrated else 1.)
            small = self.r @ design
            gb = small_u[:, None]*(small_u @ small)[None, :]-small_precision @ small
            for coordinate in ([self.stock_index] if self.stock_index is not None else [])+(
                    list(range(self.level_start, self.level_start+len(self.levels))) if self.level_sd else []):
                stock_coordinate = coordinate == self.stock_index
                prior_sd = self.stock_sd if stock_coordinate else self.level_sd
                dd, dm = np.zeros_like(design), np.zeros(self.r.shape[1])
                for row, col, sd, curve, calibrated in self.linear_assignments:
                    if calibrated and (stock_coordinate or self.level_index[curve] == coordinate-self.level_start):
                        dd[row, col] = sd*factors[curve]*prior_sd
                for row, value, curve, calibrated in self.linear_fixed:
                    if calibrated and (stock_coordinate or self.level_index[curve] == coordinate-self.level_start):
                        dm[row] = value*factors[curve]*prior_sd
                g[coordinate] += np.sum(gb*(self.r @ dd))+small_u @ (self.r @ dm)
        if self.noise_index is not None:
            trace = (self.noise.n-len(eigenvalues))/variance+np.sum(1/(variance+eigenvalues))
            g[self.noise_index] = variance*(u @ u-trace)
        return lp, g

    def core_prior(self, core):
        if not np.isfinite(core).all() or np.any(core < self.low) or np.any(core > self.high):
            return -np.inf
        rates = self.intrinsic_rates(core).ravel()
        if np.any(rates < self.rate_bounds[:, 0]) or np.any(rates > self.rate_bounds[:, 1]):
            return -np.inf
        capacities = core[self.capacity_start:self.capacity_start+len(self.free_capacity)]
        lp = -.5*np.sum(((capacities-np.log(self.priors.capacity_median))/self.priors.capacity_log_sd)**2)
        if self.level_sd:
            lp -= .5*np.sum(core[self.level_start:self.level_start+len(self.levels)]**2)
        if self.stock_index is not None:
            lp -= .5*core[self.stock_index]**2
        if self.noise_index is not None:
            z = core[self.noise_index]-np.log(self.priors.noise_scale)
            if abs(z) > 100:
                return -np.inf
            lp += z-2.5*np.log1p(np.exp(2*z)/4.)
        return float(lp)

    def hyper_prior(self, hyper):
        if not np.isfinite(hyper).all() or np.any(np.abs(hyper) > 100):
            return -np.inf
        tau, rho = np.exp(hyper[:2]), np.tanh(hyper[2])
        if abs(rho) >= 1:
            return -np.inf
        return float(np.sum(hyper[:2]-.5*(tau/self.priors.between_log_sd_scale)**2)
                     +self.priors.correlation_lkj_shape*np.log1p(-rho*rho))

    def rate_prior(self, core, hyper):
        hp = self.hyper_prior(hyper)
        if not np.isfinite(hp):
            return -np.inf
        return hp+rate_marginal_logpdf(self.intrinsic_rates(core), between_covariance(hyper), self.priors)

    def logpdf(self, core, hyper):
        cp = self.core_prior(core)
        if not np.isfinite(cp):
            return -np.inf
        rp = self.rate_prior(core, hyper)
        return cp+rp+self.likelihood(core) if np.isfinite(rp) else -np.inf

    def logpdf_gradient(self, core, hyper):
        cp, rp = self.core_prior(core), self.rate_prior(core, hyper)
        if not np.isfinite(cp+rp):
            return -np.inf, np.zeros(len(core))
        lp, gradient = self.likelihood(core, gradient=True)
        covariance = between_covariance(hyper)
        rates = self.intrinsic_rates(core)
        mean = rates.mean(axis=0)
        mean_cov = np.eye(2)*self.priors.population_log_sd**2+covariance/len(rates)
        mean_gradient = np.linalg.solve(mean_cov, mean-np.log([self.priors.kon_median, self.priors.koff_median]))
        rate_gradient = -(rates-mean) @ np.linalg.inv(covariance)-mean_gradient/len(rates)
        gradient[:self.n_rates] += rate_gradient.ravel()
        gradient[self.capacity_start:self.capacity_start+len(self.free_capacity)] -= (
            core[self.capacity_start:self.capacity_start+len(self.free_capacity)]-np.log(self.priors.capacity_median))/self.priors.capacity_log_sd**2
        if self.level_sd:
            gradient[self.level_start:self.level_start+len(self.levels)] -= core[self.level_start:self.level_start+len(self.levels)]
        if self.stock_index is not None:
            gradient[self.stock_index] += self.stock_sd*mean_gradient[0]-core[self.stock_index]
        if self.noise_index is not None:
            z = core[self.noise_index]-np.log(self.priors.noise_scale)
            gradient[self.noise_index] += 1-5*np.exp(2*z)/(4+np.exp(2*z))
        return cp+rp+lp, gradient


def _split(values):
    n = values.shape[1]//2
    return np.concatenate([values[:, :n], values[:, -n:]], axis=0)


def _rhat(values):
    n = values.shape[1]
    within = np.var(values, axis=1, ddof=1).mean()
    between = n*np.var(values.mean(axis=1), ddof=1)
    return float(np.sqrt(((n-1)/n*within+between/n)/within)) if within > 0 else np.inf


def _ess(values):
    """Between-chain variance plus Geyer initial positive/monotone paired sums."""
    m, n = values.shape
    centered = values-values.mean(axis=1, keepdims=True)
    fft = np.fft.rfft(centered, n=2**int(np.ceil(np.log2(2*n))))
    autocov = np.fft.irfft(fft*np.conj(fft), axis=1)[:, :n]/n
    within = autocov[:, 0].mean()*n/(n-1)
    variance = within*(n-1)/n+np.var(values.mean(axis=1), ddof=1)
    if not variance > 0:
        return 0.
    rho = 1-(within-autocov.mean(axis=0))/variance
    rho[0] = 1.
    pairs, previous = [], np.inf
    for i in range(0, n-1, 2):
        pair = float(rho[i]+rho[i+1])
        if pair < 0:
            break
        previous = min(previous, pair)
        pairs.append(previous)
    tau = max(-1+2*sum(pairs), 1/np.log10(max(m*n, 10)))
    return float(min(m*n/tau, m*n*np.log10(max(m*n, 10))))


def chain_diagnostics(values):
    values = np.asarray(values, float)
    if values.ndim != 2 or values.shape[0] < 4 or values.shape[1] < 20 or not np.isfinite(values).all():
        return dict(rhat=np.inf, bulk_ess=0., tail_ess=0., mean_ess=0., mcse_mean=np.nan)
    split = _split(values)
    ranks = stats.rankdata(split.ravel(), method="average")
    rank = stats.norm.ppf((ranks-.375)/(len(ranks)+.25)).reshape(split.shape)
    folded = np.abs(split-np.median(split))
    ranks_fold = stats.rankdata(folded.ravel(), method="average")
    fold = stats.norm.ppf((ranks_fold-.375)/(len(ranks_fold)+.25)).reshape(split.shape)
    a, b = np.quantile(values, [.05, .95])
    ess_mean = _ess(split)
    return dict(rhat=max(_rhat(rank), _rhat(fold)), bulk_ess=_ess(rank),
                tail_ess=min(_ess((split <= a).astype(float)), _ess((split <= b).astype(float))),
                mean_ess=ess_mean, mcse_mean=float(np.std(values, ddof=1)/np.sqrt(ess_mean)) if ess_mean > 0 else np.nan)


def _slice_update(value, logpdf, rng, width=1., steps=30):
    height = logpdf(value)+np.log(rng.uniform())
    left = value-width*rng.uniform()
    right = left+width
    j = int(rng.integers(steps))
    k = steps-1-j
    while j > 0 and logpdf(left) > height:
        left -= width
        j -= 1
    while k > 0 and logpdf(right) > height:
        right += width
        k -= 1
    for _ in range(1000):
        candidate = rng.uniform(left, right)
        if logpdf(candidate) >= height:
            return candidate
        if candidate < value:
            left = candidate
        else:
            right = candidate
    raise RuntimeError("Slice shrinkage budget exhausted; chain is incomplete.")


def _proposal_covariance(problem, center, hyper):
    """Numerical curvature is an MCMC proposal only, never a reported error bar."""
    if problem.constant_linear:
        # An augmented Jacobian SVD preserves exact calibration null directions;
        # differencing a large Hessian can invent curvature at very low noise.
        sigma = problem.fixed_noise if problem.noise_index is None else np.exp(center[problem.noise_index])
        eigenvalues, vectors, fixed = problem._linear_cache
        white = problem.noise.apply(problem.prediction_jacobian(center))
        projection = problem.q.T @ white
        likelihood = (white-problem.q @ projection)/sigma+problem.q @ (
            vectors @ ((vectors.T @ projection)/np.sqrt(sigma**2+eigenvalues)[:, None]))
        rates, dimension = problem.n_rates, len(center)
        covariance = between_covariance(hyper)
        full = np.kron(np.eye(len(problem.repeats)), covariance)+np.kron(
            np.ones((len(problem.repeats), len(problem.repeats))), np.eye(2)*problem.priors.population_log_sd**2)
        mapping = np.zeros((rates, dimension))
        mapping[:, :rates] = np.eye(rates)
        if problem.stock_index is not None:
            mapping[::2, problem.stock_index] = -problem.stock_sd
        factors = [likelihood, linalg.solve_triangular(linalg.cholesky(full, lower=True), mapping, lower=True)]
        diagonal = np.zeros(dimension)
        diagonal[problem.capacity_start:problem.capacity_start+len(problem.free_capacity)] = 1/problem.priors.capacity_log_sd
        if problem.level_sd:
            diagonal[problem.level_start:problem.level_start+len(problem.levels)] = 1.
        if problem.stock_index is not None:
            diagonal[problem.stock_index] = 1.
        if problem.noise_index is not None:
            z = center[problem.noise_index]-np.log(problem.priors.noise_scale)
            diagonal[problem.noise_index] = np.sqrt(40*np.exp(2*z)/(4+np.exp(2*z))**2+2*(
                problem.noise.n-len(eigenvalues)+np.sum((sigma**2/(sigma**2+eigenvalues))**2)))
        factors.append(np.diag(diagonal))
        _, singular, vt = np.linalg.svd(np.vstack(factors), full_matrices=False)
        if singular[-1] <= singular[0]*np.finfo(float).eps*max(likelihood.shape):
            raise ValueError("Joint proposal geometry is numerically unresolved; rescale response units or refine the analysis design.")
        return (vt.T/singular**2) @ vt, "Analytic augmented-Jacobian SVD proposal; exact calibration null directions retained; not an uncertainty estimate"
    n, hessian = len(center), np.zeros((len(center), len(center)))
    steps = np.maximum(np.abs(center), 1.)*1e-6
    for i in range(n):
        di = np.zeros(n)
        di[i] = steps[i]
        hessian[:, i] = -(problem.logpdf_gradient(center+di, hyper)[1]-problem.logpdf_gradient(center-di, hyper)[1])/(2*steps[i])
    hessian = (hessian+hessian.T)/2
    if not np.isfinite(hessian).all():
        return np.eye(n)*.01, "Diagonal proposal: curvature unavailable"
    eigenvalues, eigenvectors = np.linalg.eigh(hessian)
    floor = max(np.max(np.abs(eigenvalues))*1e-12, 1e-6)
    covariance = (eigenvectors/np.maximum(eigenvalues, floor)) @ eigenvectors.T
    return covariance, f"Proposal-only curvature eigenvalue floor {floor:.6g}; diagnostic-gated MCMC, not Laplace intervals"


def langevin_step(core, state, gradient, covariance, chol, scale, rng, target):
    """One fixed-metric MALA step with its full asymmetric Hastings correction."""
    innovation = rng.normal(size=len(core))
    candidate = core+.5*scale**2*(covariance @ gradient)+scale*(chol @ innovation)
    candidate_lp, candidate_gradient = target(candidate)
    ratio = -np.inf
    if np.isfinite(candidate_lp) and np.isfinite(candidate_gradient).all():
        reverse = linalg.solve_triangular(chol, core-candidate-.5*scale**2*(covariance @ candidate_gradient), lower=True)/scale
        ratio = candidate_lp-state+.5*(innovation @ innovation-reverse @ reverse)
    moved = bool(np.log(rng.uniform()) < ratio)
    return (candidate, candidate_lp, candidate_gradient, moved) if moved else (core, state, gradient, moved)


def fit_joint(result, *, priors=None, measurement_sd=None, include_baseline=True, chains=4,
              warmup=2000, draws=8000, runtime_s=600., seed=310027):
    if (not isinstance(chains, int) or not 4 <= chains <= 8 or not isinstance(warmup, int) or warmup < 100
            or not isinstance(draws, int) or not 20 <= draws <= 20000 or not np.isfinite(runtime_s) or runtime_s <= 0
            or not isinstance(seed, int) or seed < 0):
        raise ValueError("Use 4-8 independent chains, at least 100 warmup steps and 20-20000 retained draws per chain.")
    problem = JointProblem(result, priors, measurement_sd=measurement_sd, include_baseline=include_baseline)
    deadline = time.perf_counter()+runtime_s
    initial_hyper = np.array([np.log(.2), np.log(.2), 0.])

    def initial_cost(core):
        if time.perf_counter() > deadline:
            raise TimeoutError("Joint initialization runtime limit")
        value, gradient = problem.logpdf_gradient(core, initial_hyper)
        return (-value, -gradient) if np.isfinite(value) else (1e100, np.zeros(len(core)))

    try:
        initial = minimize(initial_cost, problem.initial, jac=True, method="L-BFGS-B", bounds=list(zip(problem.low, problem.high)),
                           options=dict(maxiter=350, ftol=1e-10))
        center = initial.x if np.isfinite(initial.fun) and initial.fun < 1e99 else problem.initial
        if time.perf_counter() > deadline:
            raise TimeoutError("Joint initialization runtime limit")
        proposal, proposal_status = _proposal_covariance(problem, center, initial_hyper)
    except TimeoutError:
        center, proposal, proposal_status = problem.initial, np.eye(len(problem.initial))*.01, "Initialization incomplete"
    dimension, all_samples, records = len(center), [], []
    children = np.random.SeedSequence(seed).spawn(chains)
    for chain in range(chains):
        rng, retained = np.random.default_rng(children[chain]), []
        core, hyper = center.copy(), initial_hyper+rng.normal(0., .3, 3)
        init_chol = linalg.cholesky(proposal, lower=True)
        for _ in range(100):
            candidate = center+2*(init_chol @ rng.normal(size=dimension))
            if np.isfinite(problem.logpdf(candidate, hyper)):
                core = candidate
                break
        state, gradient = problem.logpdf_gradient(core, hyper)
        accepted, attempted, warmed = 0, 0, 0
        covariance, mean, scatter, count = proposal.copy(), core.copy(), np.zeros_like(proposal), 1
        log_scale = np.log(1.3/dimension**(1/6))
        status, reason = "Complete", ""
        start = time.perf_counter()
        for step in range(warmup+draws):
            if time.perf_counter() >= deadline:
                status, reason = "Incomplete: runtime limit", "Requested retained draws are not complete"
                break
            try:
                chol = linalg.cholesky(covariance, lower=True)
                core, state, gradient, moved = langevin_step(core, state, gradient, covariance, chol, np.exp(log_scale), rng,
                    lambda x: problem.logpdf_gradient(x, hyper))
                attempted += 1
                accepted += int(moved)
                if problem.stock_index is not None and problem.constant_linear:
                    covariance_rates = between_covariance(hyper)
                    mean_covariance = np.eye(2)*problem.priors.population_log_sd**2+covariance_rates/len(problem.repeats)
                    precision = np.linalg.inv(mean_covariance)
                    mean_eff = core[:problem.n_rates].reshape(-1, 2).mean(axis=0)
                    variance_stock = 1/(1/problem.stock_sd**2+precision[0, 0])
                    mean_stock = variance_stock*(precision[0] @ (mean_eff-np.log([problem.priors.kon_median, problem.priors.koff_median])))
                    effective_on = core[:problem.n_rates:2]
                    lower = np.max(effective_on-problem.rate_bounds[::2, 1])
                    upper = np.min(effective_on-problem.rate_bounds[::2, 0])
                    a, b = (lower-mean_stock)/np.sqrt(variance_stock), (upper-mean_stock)/np.sqrt(variance_stock)
                    pa, pb = ndtr(a), ndtr(b)
                    delta = (mean_stock+np.sqrt(variance_stock)*ndtri(np.clip(rng.uniform(pa, pb), np.nextafter(0., 1.), np.nextafter(1., 0.))) if pb-pa > 1e-12 else
                             stats.truncnorm.rvs(a, b, loc=mean_stock, scale=np.sqrt(variance_stock), random_state=rng))
                    core[problem.stock_index] = delta/problem.stock_sd
                if problem.level_sd and problem.constant_linear:
                    covariance_rates = between_covariance(hyper)
                    precision = np.linalg.inv(np.eye(2)*problem.priors.population_log_sd**2+covariance_rates/len(problem.repeats))
                    rates = problem.intrinsic_rates(core)
                    level_slice = slice(problem.level_start, problem.level_start+len(problem.levels))
                    old_mean = float(np.mean(core[level_slice])*problem.level_sd)
                    location = rates.mean(axis=0)+np.array([old_mean, 0.])
                    variance_level = 1/(len(problem.levels)/problem.level_sd**2+precision[0, 0])
                    mean_level = variance_level*(precision[0] @ (location-np.log([problem.priors.kon_median, problem.priors.koff_median])))
                    lower = np.max(rates[:, 0]+old_mean-problem.rate_bounds[::2, 1])
                    upper = np.min(rates[:, 0]+old_mean-problem.rate_bounds[::2, 0])
                    a, b = (lower-mean_level)/np.sqrt(variance_level), (upper-mean_level)/np.sqrt(variance_level)
                    pa, pb = ndtr(a), ndtr(b)
                    new_mean = (mean_level+np.sqrt(variance_level)*ndtri(np.clip(rng.uniform(pa, pb), np.nextafter(0., 1.), np.nextafter(1., 0.))) if pb-pa > 1e-12 else
                        stats.truncnorm.rvs(a, b, loc=mean_level, scale=np.sqrt(variance_level), random_state=rng))
                    core[:problem.n_rates:2] += old_mean-new_mean
                    core[level_slice] += (new_mean-old_mean)/problem.level_sd
                for h in range(3):
                    def hyper_density(value):
                        trial = hyper.copy()
                        trial[h] = value
                        return problem.rate_prior(core, trial)
                    hyper[h] = _slice_update(hyper[h], hyper_density, rng)
                # This additional prior-preserving move avoids a centered funnel
                # when between-repeat variation is near zero. Retained MH has a
                # fixed kernel; no posterior interval comes from its curvature.
                new_hyper = hyper+rng.normal(0., .35, 3)
                if np.isfinite(problem.hyper_prior(new_hyper)):
                    candidate = core.copy()
                    mapped = interweave_rates(problem.intrinsic_rates(core), between_covariance(hyper),
                                              between_covariance(new_hyper), problem.priors)
                    mapped[:, 0] += problem.calibration(core)[0]
                    candidate[:problem.n_rates] = mapped.ravel()
                    ratio = (problem.core_prior(candidate)+problem.likelihood(candidate)+problem.hyper_prior(new_hyper)
                             -problem.core_prior(core)-problem.likelihood(core)-problem.hyper_prior(hyper))
                    if np.log(rng.uniform()) < ratio:
                        core, hyper = candidate, new_hyper
                state, gradient = problem.logpdf_gradient(core, hyper)
                if step < warmup:
                    warmed += 1
                    count += 1
                    difference = core-mean
                    mean += difference/count
                    scatter += np.outer(difference, core-mean)
                    if step >= 49 and (step+1) % 25 == 0:
                        covariance = .5*proposal+.5*(scatter+20*proposal)/(count-1+20)+1e-6*proposal
                        log_scale += .5*(float(moved)-.574)/np.sqrt((step+1)/25)
                else:
                    retained.append(np.r_[core, hyper])
            except (ValueError, FloatingPointError, np.linalg.LinAlgError, RuntimeError) as exc:
                status, reason = "Incomplete: numerical or slice failure", str(exc)
                break
        records.append(dict(chain=chain+1, status=status, reason=reason, warmup_completed=warmed,
            requested_draws=draws, retained_draws=len(retained), attempted_joint_steps=attempted,
            joint_acceptance=accepted/max(attempted, 1), elapsed_s=time.perf_counter()-start))
        all_samples.append(np.array(retained).reshape(-1, dimension+3))
    return _joint_payload(problem, all_samples, records, dict(chains=chains, warmup=warmup, draws=draws,
        runtime_s=runtime_s, seed=seed, include_baseline=include_baseline, proposal_status=proposal_status))


def _joint_payload(problem, samples, records, settings):
    complete = all(len(x) == settings["draws"] and r["status"] == "Complete" for x, r in zip(samples, records))
    raw_names = problem.names+["log_between_kon", "log_between_koff", "correlation_unconstrained"]
    tables, derived_by_chain = [], []
    rng = np.random.default_rng(np.random.SeedSequence([settings["seed"], 7703]))
    for chain, array in enumerate(samples):
        output = []
        for draw, row in enumerate(array):
            core, hyper = row[:-3], row[-3:]
            covariance = between_covariance(hyper)
            mean, conditional_cov = population_conditional(problem.intrinsic_rates(core), covariance, problem.priors)
            population = rng.multivariate_normal(mean, conditional_cov)
            future = rng.multivariate_normal(population, covariance)
            rates = problem.intrinsic_rates(core)
            stock, levels = problem.calibration(core)
            values = dict(population_median_kon=np.exp(population[0]), population_median_koff=np.exp(population[1]),
                population_median_KD_nM=np.exp(population[1]-population[0])*1e9,
                between_log_sd_kon=np.exp(hyper[0]), between_log_sd_koff=np.exp(hyper[1]),
                between_rate_correlation=np.tanh(hyper[2]), common_stock_factor=np.exp(stock))
            log_kd_var = covariance[0, 0]+covariance[1, 1]-2*covariance[0, 1]
            values.update(population_mean_KD_nM=np.exp(population[1]-population[0]+.5*log_kd_var)*1e9,
                population_SD_KD_nM=np.exp(population[1]-population[0]+.5*log_kd_var)*np.sqrt(np.expm1(log_kd_var))*1e9,
                new_repeat_kon=np.exp(future[0]), new_repeat_koff=np.exp(future[1]),
                new_repeat_KD_nM=np.exp(future[1]-future[0])*1e9)
            for i, repeat in enumerate(problem.repeats):
                values.update({f"kon::{repeat}": np.exp(rates[i, 0]), f"koff::{repeat}": np.exp(rates[i, 1]),
                               f"KD_nM::{repeat}": np.exp(rates[i, 1]-rates[i, 0])*1e9})
            for j, key in enumerate(problem.free_capacity):
                values[key] = np.exp(core[problem.capacity_start+j])
            if problem.stock_index is None:
                values.pop("common_stock_factor")
            if problem.level_sd:
                values.update({f"concentration_factor::{level*1e9:g}nM": np.exp(levels[j]) for j, level in enumerate(problem.levels)})
            if problem.noise_index is not None:
                values["measurement_noise_scale"] = np.exp(core[problem.noise_index])
            output.append(values)
        frame = pd.DataFrame(output)
        derived_by_chain.append(frame)
        if not frame.empty:
            frame.insert(0, "draw", np.arange(1, len(frame)+1))
            frame.insert(0, "chain", chain+1)
            tables.append(frame)
    all_derived = pd.concat(tables, ignore_index=True) if tables else pd.DataFrame()
    names = [n for n in all_derived if n not in {"chain", "draw"}]
    diagnostics, summaries = [], []
    diagnostics_by_name = {}
    if complete:
        for name in names:
            diagnostics_by_name[name] = chain_diagnostics(np.array([frame[name].to_numpy() for frame in derived_by_chain]))
    required = [n for n in names if not n.startswith("new_repeat_") and not n.startswith("population_")]
    jointly_resolved = bool(complete and required and all(diagnostics_by_name[n]["rhat"] <= 1.01
        and min(diagnostics_by_name[n]["bulk_ess"], diagnostics_by_name[n]["tail_ess"]) >= 400 for n in required))
    for name in names:
        values = all_derived[name].to_numpy()
        diagnostic = diagnostics_by_name.get(name, chain_diagnostics(np.array([])))
        is_predictive = name.startswith("new_repeat_")
        available = jointly_resolved and diagnostic["rhat"] <= 1.01 and min(diagnostic["bulk_ess"], diagnostic["tail_ess"]) >= 400
        low, high = np.quantile(values, [.025, .975])
        diagnostics.append(dict(estimate=name, **diagnostic))
        summaries.append(dict(estimate=name, posterior_median=float(np.median(values)), posterior_mean=float(np.mean(values)),
            posterior_sd=float(np.std(values, ddof=1)) if len(values) > 1 else np.nan,
            interval95_low=float(low) if available else np.nan, interval95_high=float(high) if available else np.nan,
            exploratory_q025=float(low), exploratory_q975=float(high),
            interval_type="New-repeat parameter prediction" if is_predictive else "Posterior credible interval",
            status="Available" if available else "Incomplete chains" if not complete else "Insufficient joint MCMC resolution"))
    raw = []
    for chain, array in enumerate(samples):
        frame = pd.DataFrame(array, columns=raw_names)
        frame.insert(0, "draw", np.arange(1, len(frame)+1))
        frame.insert(0, "chain", chain+1)
        raw.append(frame)
    curves, predictive = (joint_curve_review(problem, samples, seed=settings["seed"]) if jointly_resolved
                          else (pd.DataFrame(), dict(status="Unavailable: joint MCMC resolution")))
    metadata = dict(revision=REVISION, fingerprint=problem.saved["fingerprint"], model="Joint hierarchical 1:1",
        priors=asdict(problem.priors), input_options=problem.options, settings=settings,
        repeat_ids=problem.repeats, source_metadata=problem.noise.metadata, fixed_measurement_sd=problem.fixed_noise,
        saved_kinetic_observations=problem.saved["n_observations"], joint_observations=problem.noise.n,
        all_chains_complete=complete, joint_nuisance_resolution=jointly_resolved, posterior_predictive=predictive,
        convergence_policy="At least 4 independent complete chains; rank-normalized/folded split Rhat <= 1.01; bulk and 5%/95% tail ESS >= 400 for every repeat rate, capacity, calibration/noise and between-repeat parameter, plus each reported estimand",
        method="Collapsed Gaussian population log-rate mean and linear response terms; preconditioned Metropolis-adjusted Langevin sampling with analytic gradients, augmented-Jacobian SVD geometry when applicable, warmup-only scale/covariance adaptation, exact conditional common-stock and shared concentration-shift updates when applicable, stepping-out slice updates for between-repeat scales/correlation, and prior-preserving centered/noncentered rate interweaving. All adaptation stops before retained sampling.",
        scope="Bayesian 1:1 lognormal random kon/koff with correlated between-repeat variation. True concentrations have one supplied common-stock and independent per-level lognormal factors shared across repeats. The measured median subtraction is undone; raw corrected responses, selected kinetic points and explicitly included baseline points enter the joint likelihood. Shared Gaussian source errors are analytically integrated with interpolation/sign/weights; no second residual covariance is added. Baselines and selected linear correction terms have explicit normal priors and are integrated, not fixed at measured medians. Source SD ratios and OU times remain conditional; an unknown common noise multiplier is inferred unless SD is supplied. No model/phase selection uncertainty or arbitrary dilution covariance is included. Gaussian correction priors replace saved correction bounds in this separate model; saved capacity/rate bounds restrict the joint domain. Credible intervals are not frequentist confidence intervals, independent-repeat sample SD, or calibration certificates. Population SD is a model-based between-repeat SD, not the SD of a population-mean estimate.")
    return dict(summary=pd.DataFrame(summaries), diagnostics=pd.DataFrame(diagnostics), chains=pd.DataFrame(records),
                samples=all_derived, raw_samples=pd.concat(raw, ignore_index=True),
                observations=problem.observation_record, curves=curves, metadata=metadata)


def joint_curve_review(problem, samples, *, seed=310027, maximum=500):
    """Conditional baselines/corrections plus fresh correlated-noise replication."""
    rng = np.random.default_rng(np.random.SeedSequence([seed, 9307]))
    selected = []
    per_chain = max(1, maximum//len(samples))
    for chain in samples:
        selected.extend(chain[np.linspace(0, len(chain)-1, min(len(chain), per_chain), dtype=int)])
    means, replications, tails = [], [], []
    for row in selected:
        core = row[:-3]
        stock, levels = problem.calibration(core)
        factors = np.exp(stock+levels[problem.level_index])
        design, fixed = np.zeros((problem.r.shape[1], len(problem.linear_groups))), np.zeros(problem.r.shape[1])
        for i, j, sd, curve, calibrated in problem.linear_assignments:
            design[i, j] = sd*(factors[curve] if calibrated else 1.)
        for i, value, curve, calibrated in problem.linear_fixed:
            fixed[i] = value*(factors[curve] if calibrated else 1.)
        small = problem.r @ design
        sigma = problem.fixed_noise if problem.noise_index is None else np.exp(core[problem.noise_index])
        prediction = problem.prediction(core)+problem.linear_columns @ fixed
        residual_white = problem.noise.apply(problem.response-prediction)
        precision = np.eye(small.shape[1])+(small.T @ small)/sigma**2
        factor = linalg.cholesky(precision, lower=True)
        location = linalg.cho_solve((factor, True), small.T @ (problem.q.T @ residual_white)/sigma**2)
        coefficient = location+linalg.solve_triangular(factor.T, rng.normal(size=len(location)), lower=False)
        mean = prediction+problem.linear_columns @ (design @ coefficient)
        error = problem.noise.draw(rng, sigma)
        replicate = mean+error
        observed_statistic = np.sum((problem.noise.apply(problem.response-mean)/sigma)**2)
        replicated_statistic = np.sum((problem.noise.apply(error)/sigma)**2)
        tails.append(replicated_statistic >= observed_statistic)
        means.append(mean)
        replications.append(replicate)
    means, replications = np.asarray(means), np.asarray(replications)
    mean_quantiles, predictive_quantiles = np.quantile(means, [.025, .5, .975], axis=0), np.quantile(replications, [.025, .975], axis=0)
    frame = pd.DataFrame(dict(time_s=problem.time, observed_raw_corrected=problem.response,
        posterior_curve_median=mean_quantiles[1], curve95_low=mean_quantiles[0], curve95_high=mean_quantiles[2],
        predictive95_low=predictive_quantiles[0], predictive95_high=predictive_quantiles[1]))
    frame["filename"] = [problem.curves[i]["filename"] for i in problem.curve_index]
    frame["concentration_nM"] = [problem.curves[i]["concentration_nM"] for i in problem.curve_index]
    frame["repeat_id"] = [problem.curves[i]["repeat_id"] for i in problem.curve_index]
    frame["kinetic_selected"] = np.concatenate([np.asarray(c["fit_mask"])[m] for c, m in zip(problem.curves, problem.masks)])
    return frame, dict(status="Available", draws=len(means), seed=seed, discrepancy="Squared Gaussian-whitened measurement residuals given each joint posterior and conditional linear-term draw",
        posterior_predictive_tail_fraction=float(np.mean(tails)),
        interpretation="Descriptive posterior predictive check using the data-informed posterior, not a uniform p-value or selection gate. Curve bands are pointwise posterior uncertainty in the same-curve mean, including its uncertain baseline/corrections. Predictive bands additionally draw fresh correlated sample/control measurement noise. They are not across-repeat sample SD or simultaneous bands.")
