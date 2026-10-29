"""Independent reaction-network simulator used only for validation.

No MIXA prediction functions are imported. Free surface species are explicit,
and reaction stoichiometry, rather than reduced response equations, propagates
the states. DOP853 is independent of the production analytic/Radau paths.
"""

import numpy as np
from scipy.integrate import solve_ivp


def simulate(times, concentration_M, on, off, p, model="langmuir", transport="None",
             nonspecific=False, rtol=2e-10):
    t = np.asarray(times, float)
    if t.ndim != 1 or not np.isfinite(t).all() or concentration_M < 0 or not on < off:
        raise ValueError("Finite times, nonnegative concentration and ordered phases are required.")
    if model == "langmuir":
        initial, observation = [p["Rmax"], 0.], [0., 1.]
        stoichiometry = np.array([[-1.], [1.]])
    elif model == "heterogeneous":
        initial, observation = [p["Rmax"], 0., p["Rmax2"], 0.], [0., 1., 0., 1.]
        stoichiometry = np.array([[-1., 0.], [1., 0.], [0., -1.], [0., 1.]])
    elif model in {"two_state", "bivalent", "sequential"}:
        initial, observation = [p["Rmax"], 0., 0.], [0., 1., 2. if model == "sequential" else 1.]
        stoichiometry = np.array([[-1., -1. if model == "bivalent" else 0.],
                                  [1., -1.], [0., 1.]])
    else:
        raise ValueError("Unknown reference reaction network.")
    if transport not in {"None", "Quasi-steady 1:1 transport", "Two-compartment transport"}:
        raise ValueError("Unknown reference transport model.")
    if transport == "Quasi-steady 1:1 transport" and (model != "langmuir" or nonspecific):
        raise ValueError("Quasi-steady reference requires one population.")
    n_specific = len(initial)
    if nonspecific:
        initial += [p["ns_Rmax"], 0.]
        observation += [0., 1.]
    observation = np.asarray(observation)
    full = transport == "Two-compartment transport"
    concentration_scale = max(concentration_M, 1e-9)
    if full:
        initial += [0.]

    def rhs(_time, state, bulk):
        surface = state[-1] * concentration_scale if full else bulk
        if transport == "Quasi-steady 1:1 transport":
            # Eliminate surface concentration using the steady flux balance.
            surface = (p["k_transport"] * bulk + p["koff"] * state[1]) / (p["k_transport"] + p["kon"] * state[0])
        capture = p["kon"] * surface * state[0] - p["koff"] * state[1]
        if model == "langmuir":
            flux = [capture]
        elif model == "heterogeneous":
            flux = [capture, p["kon2"] * surface * state[2] - p["koff2"] * state[3]]
        elif model == "two_state":
            flux = [capture, p["k_forward"] * state[1] - p["k_reverse"] * state[2]]
        elif model == "sequential":
            flux = [capture, p["kon2"] * surface * state[1] - p["koff2"] * state[2]]
        else:
            flux = [2 * p["kon"] * surface * state[0] - p["koff"] * state[1],
                    p["kon2"] * state[1] * state[0] - 2 * p["koff2"] * state[2]]
        derivative = stoichiometry @ np.asarray(flux)
        if nonspecific:
            ns = p["ns_kon"] * surface * state[n_specific] - p["ns_koff"] * state[n_specific + 1]
            derivative = np.r_[derivative, -ns, ns]
        if full:
            consumption = observation @ derivative
            derivative = np.r_[derivative, p["k_exchange"] * (bulk / concentration_scale - state[-1])
                               - p["response_to_M"] * consumption / concentration_scale]
        return derivative

    state = np.repeat(np.asarray(initial)[:, None], len(t), axis=1)
    if len(t) and t.max() > on:
        atol = np.maximum(np.abs(initial), 1.) * 1e-11
        if full:
            atol[-1] = 1e-12
        association = solve_ivp(lambda ti, y: rhs(ti, y, concentration_M), (on, off), initial,
                                method="DOP853", rtol=rtol, atol=atol, dense_output=True)
        if not association.success:
            raise RuntimeError(association.message)
        mask = (t >= on) & (t <= off)
        state[:, mask] = association.sol(t[mask])
        mask = t > off
        if mask.any():
            dissociation = solve_ivp(lambda ti, y: rhs(ti, y, 0.), (off, float(t.max())), association.sol(off),
                                     method="DOP853", rtol=rtol, atol=atol, dense_output=True)
            if not dissociation.success:
                raise RuntimeError(dissociation.message)
            state[:, mask] = dissociation.sol(t[mask])
    response = observation @ state[:len(observation)]
    response += p.get("offset", 0.) + p.get("drift", 0.) * (t - on)
    response += p.get("bulk", 0.) * concentration_M * ((t >= on) & (t < off))
    response += p.get("ns_linear", 0.) * concentration_M * np.clip(t - on, 0., off - on)
    return response


def stationary_noise(rng, times, sd, tau=0.):
    """Independent Gaussian samples, or a stationary OU process on actual gaps."""
    t = np.asarray(times, float)
    noise = rng.normal(0., sd, len(t))
    if tau > 0:
        for i, dt in enumerate(np.diff(t), 1):
            alpha = np.exp(-dt / tau)
            noise[i] = alpha * noise[i - 1] + np.sqrt(-np.expm1(-2 * dt / tau)) * noise[i]
    return noise
