import ast
from copy import deepcopy
import hashlib
import io
import json
from pathlib import Path
import zipfile

import numpy as np
import pytest

from audits.validate_methods import TRUTH, probability_summary, summarize_intervals
from mixa_education import teaching_example
from mixa_mechanisms import _whiten, binding_prediction
import mixa_methods
from mixa_methods import EQUATIONS, bibliography, equation_ids, equation_record, write_methods_exports
from validation.reference_simulator import simulate


def test_every_equation_has_explicit_provenance_units_and_existing_implementation_checks():
    root = Path(__file__).resolve().parents[1]
    record = equation_record()
    assert len(record["equations"]) >= 17
    for entry in record["equations"].values():
        assert all(entry[key] for key in ["title", "equations", "units", "assumptions", "provenance", "implementation", "regression_tests"])
        for item in entry["implementation"] + entry["regression_tests"]:
            filename, _, symbol = item.partition(":")
            source = root / filename
            assert source.is_file()
            if symbol:
                names = {node.name for node in ast.walk(ast.parse(source.read_text())) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))}
                assert symbol in names, item
        assert set(entry["references"]) <= set(record["references"])
    assert all(ref["doi"] and ref["author"] for ref in record["references"].values())


def test_archived_frontier_runner_matches_performance_hash_and_unchanged_calibration_functions():
    root = Path(__file__).resolve().parents[1]
    capsule = root/"validation/frontier_source_capsule/validate_frontier_initial.py"
    expected = json.loads((root/"validation/frontier_performance/results.json").read_text())
    assert hashlib.sha256(capsule.read_bytes()).hexdigest() == expected["validation_code_sha256"]["audits/validate_frontier.py"]
    original, current = capsule.read_text(), (root/"audits/validate_frontier.py").read_text()
    for name in ["calibration", "performance"]:
        def function_text(source):
            node = next(node for node in ast.parse(source).body if isinstance(node, ast.FunctionDef) and node.name == name)
            return ast.get_source_segment(source, node)
        assert function_text(original) == function_text(current)


def test_equation_records_do_not_mutate_registry_or_silently_map_unknown_models():
    record = equation_record(["langmuir"])
    record["equations"]["langmuir"]["equations"].append("changed")
    assert "changed" not in EQUATIONS["langmuir"]["equations"]
    with pytest.raises(ValueError, match="Unknown equation"):
        equation_record(["unknown"])
    with pytest.raises(ValueError, match="No equation mapping"):
        equation_ids(dict(model="unknown"))


def test_export_includes_only_applicable_equations_and_sources_and_saved_controls():
    result = dict(model="bivalent", transport="Two-compartment transport", nonspecific=True, correlation_time=5.,
                  parameter_controls=[dict(key="kon", fixed=False, initial=1e5)],
                  recipe=dict(windows=dict(phase_assoc_start_s=20., phase_dissoc_start_s=100.), normalize=True))
    before = deepcopy(result)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        write_methods_exports(archive, {"Kinetic": result})
    assert result == before
    with zipfile.ZipFile(io.BytesIO(buffer.getvalue())) as archive:
        record = json.loads(archive.read("methods/equations_and_sources.json"))
        assert set(record["equations"]) == {"objective", "repeat_statistics", "bivalent", "transport_full",
                                            "reversible_background", "observation_terms", "ou_noise", "profiles"}
        assert record["run"]["Kinetic"]["recipe"] == result["recipe"]
        assert "nguyen2023" in record["references"]
        assert "transport_qss" not in record["equations"]
        assert "@article{nguyen2023" in archive.read("methods/REFERENCES.bib").decode()
        assert "status" in json.loads(archive.read("methods/validation_evidence.json"))


def test_legacy_and_other_analysis_families_have_explicit_mappings():
    assert "delivery_lag" in equation_ids(dict(shared_model="1:1+MT"))
    assert "two_state" in equation_ids(dict(model="2-state"))
    assert equation_ids(dict(model="hill"), "Equilibrium") == ["objective", "repeat_statistics", "equilibrium"]
    assert "kobs" in equation_ids({}, "kobs")
    assert "nguyen2023" not in bibliography(equation_record(["langmuir"]))


@pytest.mark.parametrize("model,transport", [(name, "None") for name in TRUTH] + [
    ("langmuir", "Quasi-steady 1:1 transport"), ("langmuir", "Two-compartment transport")])
def test_independent_stoichiometric_simulation_agrees_with_production(model, transport):
    t = np.r_[np.arange(0., 201., 3.), 19.9, 20., 99.9, 100., 100.1]
    t.sort()
    p = {**TRUTH[model], "k_transport": 3e6, "k_exchange": .2, "response_to_M": 2e-9}
    reference = simulate(t, 150e-9, 20., 100., p, model, transport)
    production = binding_prediction(t, 150e-9, 20., 100., p, model, transport)
    np.testing.assert_allclose(reference, production, atol=2e-5, rtol=1e-7)
    sparse = simulate(t[::3], 150e-9, 20., 100., p, model, transport)
    np.testing.assert_allclose(sparse, reference[::3], atol=1e-7)


def test_reference_simulator_does_not_import_production_prediction_code():
    source = Path(__file__).resolve().parents[1] / "validation" / "reference_simulator.py"
    imports = [node for node in ast.walk(ast.parse(source.read_text())) if isinstance(node, (ast.Import, ast.ImportFrom))]
    assert all(not getattr(node, "module", "").startswith("mixa") for node in imports if isinstance(node, ast.ImportFrom))
    assert all(not name.name.startswith("mixa") for node in imports if isinstance(node, ast.Import) for name in node.names)


def test_ou_innovations_match_direct_covariance_quadratic_form_and_determinant():
    times = np.array([20., 20.3, 21., 29., 100., 102.])
    residual = np.array([.2, -.1, .3, .1, -.2, .4])
    tau = 8.
    correlation = np.exp(-np.abs(times[:, None]-times[None, :])/tau)
    innovation, logdet = _whiten(residual, times, tau)
    assert innovation @ innovation == pytest.approx(residual @ np.linalg.solve(correlation, residual), rel=1e-12)
    assert logdet == pytest.approx(np.linalg.slogdet(correlation)[1], rel=1e-12)


def test_monte_carlo_summaries_keep_missing_intervals_and_failures_in_denominators():
    rows = [dict(scenario="test", parameter="KD_nM", estimate=10., truth=10., interval_available=True, covered=True, status="Complete"),
            dict(scenario="test", parameter="KD_nM", estimate=np.nan, truth=10., interval_available=False, covered=False, status="Failed")]
    result = summarize_intervals(rows)[0]
    assert result["interval_availability"]["fraction"] == .5
    assert result["coverage_when_available"]["fraction"] == 1.
    assert result["covered_and_available_fraction_all_runs"]["fraction"] == .5
    assert result["statuses"] == {"Complete": 1, "Failed": 1}
    assert probability_summary(0, 0)["fraction"] is None
    assert probability_summary(0, 40)["mc95_high"] > .08
    assert probability_summary(40, 40)["mc95_low"] < .92


def test_benchmark_evidence_is_not_labeled_current_if_production_source_changes(tmp_path, monkeypatch):
    (tmp_path / "validation").mkdir()
    payload = b"fitting code"
    (tmp_path / "engine.py").write_bytes(payload)
    (tmp_path / "validation" / "benchmark_summary.json").write_text(json.dumps(dict(
        production_code_sha256={"engine.py": hashlib.sha256(payload).hexdigest()})))
    monkeypatch.setattr(mixa_methods, "ROOT", tmp_path)
    assert mixa_methods.validation_evidence()["status"] == "Source-matched synthetic benchmark evidence"
    (tmp_path / "engine.py").write_bytes(b"changed")
    assert mixa_methods.validation_evidence()["status"] == "Historical evidence; source differs"


def test_education_window_example_changes_only_objective_mask_not_measurements_or_history():
    complete = teaching_example()
    trimmed = teaching_example(assoc=(40., 80.), dissoc=(120., 150.))
    assert trimmed["used"].sum() < complete["used"].sum()
    np.testing.assert_array_equal(trimmed["prediction"], complete["prediction"])
    np.testing.assert_array_equal(trimmed["measured"], complete["measured"])

