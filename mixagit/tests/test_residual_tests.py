from copy import deepcopy

import numpy as np

from mixa_automation import FitPolicy, assess_fit
from mixa_mechanisms import fit_mechanism, parameter_defaults
from mixa_residual_tests import serial_null_check


def curves(seed=19, tau=0.):
    from validation.reference_simulator import simulate, stationary_noise

    t = np.arange(0., 181., 2.)
    rng = np.random.default_rng(seed)
    data = []
    for c in [5., 15., 50., 150., 500.]:
        y = simulate(t, c*1e-9, 20., 100., dict(kon=1.2e5, koff=.012, Rmax=90.))
        data.append(dict(filename="one", repeat_id="R1", concentration_nM=c, concentration_M=c*1e-9,
            on=20., off=100., time=t, response=y+stationary_noise(rng, t, .2, tau), fit_mask=t >= 20.,
            relative_sd=1., noise_sd=.2))
    return data


def test_joint_serial_null_is_reproducible_preserves_fit_and_scans_all_phases():
    fit = fit_mechanism(curves(), "langmuir", parameter_defaults("langmuir"), starts=2)
    before = deepcopy(fit["values"])
    check = serial_null_check(fit, draws=499)
    assert check["looks"] == 10
    assert 1/500 <= check["p_mc"] <= 1.
    assert not check["flag"]
    assert fit["values"] == before
    assert check == serial_null_check(fit, draws=499)


def test_true_ou_noise_is_flagged_under_iid_but_not_after_the_supplied_whitening():
    data = curves(tau=8.)
    iid = fit_mechanism(data, "langmuir", parameter_defaults("langmuir"), starts=2)
    gls = fit_mechanism(data, "langmuir", parameter_defaults("langmuir"), starts=2, correlation_time=8.)
    assert serial_null_check(iid)["flag"]
    assert not serial_null_check(gls)["flag"]
    assert assess_fit(gls, FitPolicy(correlation_time=8.))["serial_check"]["available"]


def test_simulated_maximum_check_does_not_join_trimmed_intervals():
    data = curves()
    for c in data:
        c["fit_mask"] &= ~((c["time"] >= 55.) & (c["time"] <= 70.))
    fit = fit_mechanism(data, "langmuir", parameter_defaults("langmuir"), starts=2)
    check = serial_null_check(fit)
    for row in check["traces"]:
        if row["phase"] == "Association":
            assert row["adjacent_pairs"] == 30
