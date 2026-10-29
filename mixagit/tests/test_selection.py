import io
import unittest
from copy import deepcopy
from unittest.mock import patch

import numpy as np

import mixa_app as app
from mixa_data import example_project, prepare_experiment
from mixa_selection import observation_masks, observation_table, validate_windows
from mixa_reporting import analyze_repeats


WINDOWS = {"phase_assoc_start_s": 20, "phase_dissoc_start_s": 100,
           "fit_assoc_start_s": 32, "fit_assoc_end_s": 90,
           "fit_dissoc_start_s": 110, "fit_dissoc_end_s": 160}


class SelectionTests(unittest.TestCase):
    def setUp(self):
        raw, design = example_project()
        self.data, _ = prepare_experiment(raw, design, "Experiment 1")
        self.included = {d["filename"]: {15, 50, 150} for d in self.data}

    def test_masks_are_disjoint_and_do_not_include_baseline(self):
        masks = observation_masks(np.arange(181.0), WINDOWS)
        self.assertEqual(int(masks["association"].sum()), 59)
        self.assertEqual(int(masks["dissociation"].sum()), 51)
        self.assertFalse(np.any(masks["kinetic"] & masks["baseline"]))
        self.assertFalse(np.any(masks["association"] & masks["dissociation"]))
        self.assertFalse(observation_masks(np.arange(181.0), {**WINDOWS, "fit_assoc_end_s": 100})["association"][100])
        with self.assertRaisesRegex(ValueError, "association fit window"):
            validate_windows({**WINDOWS, "fit_assoc_end_s": 110})

    def test_excluded_observations_do_not_change_shared_fit_or_uncertainty(self):
        kwargs = dict(assoc_window_start=32, assoc_window_end=90, dissoc_window_start=110, dissoc_window_end=160)
        optimizer = app.least_squares
        objective_sizes = []

        def spy(objective, initial, **options):
            objective_sizes.append(len(objective(initial)))
            return optimizer(objective, initial, **options)

        with patch.object(app, "least_squares", side_effect=spy):
            first = app.fit_kinetics_shared_params(self.data, 20, 100, self.included, **kwargs)
        self.assertTrue(objective_sizes)
        self.assertEqual(set(objective_sizes), {9 * 110})
        self.assertEqual(first["n_fit_observations"], 9 * 110)
        self.assertEqual(first["degrees_of_freedom"], 9 * 110 - 5)
        changed = deepcopy(self.data)
        for data in changed:
            masks = observation_masks(data["time"], WINDOWS)
            excluded = ~(masks["kinetic"] | masks["baseline"])
            for values in data["responses"].values():
                values[excluded] += 1e6
        second = app.fit_kinetics_shared_params(changed, 20, 100, self.included, **kwargs)
        self.assertIsNotNone(first)
        self.assertIsNotNone(second)
        for key in ["global_kon", "global_koff", "global_KD", "kon_sem", "koff_sem", "KD_sem"]:
            np.testing.assert_allclose(first[key], second[key], rtol=1e-9, atol=1e-15)
        self.assertTrue(all(fit["n_fit_points"] == 110 for fit in first["individual_fits"]))
        self.assertTrue(all(len(fit["residuals_fit"]) == 110 for fit in first["individual_fits"]))

    def test_kobs_and_dissociation_use_their_separate_windows(self):
        kwargs = dict(assoc_window_start=32, assoc_window_end=90, dissoc_window_start=110, dissoc_window_end=160)
        first = app.fit_kobs_linearization(self.data, self.included, 20, 100, **kwargs)
        changed = deepcopy(self.data)
        for data in changed:
            masks = observation_masks(data["time"], WINDOWS)
            for values in data["responses"].values():
                values[~(masks["kinetic"] | masks["baseline"])] -= 1e6
        second = app.fit_kobs_linearization(changed, self.included, 20, 100, **kwargs)
        np.testing.assert_allclose([first["kass"], first["kdiss"]], [second["kass"], second["kdiss"]], rtol=1e-10)
        for a, b in zip(first["curve_fits"], second["curve_fits"]):
            self.assertEqual((min(a["assoc_time_abs_s"]), max(a["assoc_time_abs_s"])), (32, 90))
            self.assertEqual((min(a["dissoc_time_abs_s"]), max(a["dissoc_time_abs_s"])), (110, 160))
            self.assertAlmostEqual(a["dissoc_direct_koff"], b["dissoc_direct_koff"])

    def test_point_manifest_matches_optimizer_selection_and_excluded_traces(self):
        table = observation_table(self.data, self.included, WINDOWS)
        self.assertFalse(table.loc[table.time_s < 20, "used_for_kinetic_fit"].any())
        self.assertFalse(table.loc[table.concentration_nM == 5, "used_for_kinetic_fit"].any())
        self.assertEqual(int(table.used_for_kinetic_fit.sum()), 3 * 3 * 110)

    def test_repeat_refits_receive_saved_windows(self):
        settings = {**WINDOWS, "binding_model_code": "1:1", "normalize_baseline": True,
                    "drift_correction": False, "include_nonspecific": False, "rmax_group_mode": "Per file (repeat-specific)"}
        calls = []

        def engine(files, on, off, included, **kwargs):
            calls.append(kwargs)
            return {"global_kon": 1.2e5, "global_koff": .012, "global_KD": 1e-7,
                    "n_fits": sum(len(included[d["filename"]]) for d in files)}

        with patch("mixa_reporting.project_context", return_value={}):
            report = analyze_repeats(self.data, self.included,
                     {"Kinetic": {"fit_settings": settings, "fit_strategy": "shared_kinetics"}}, {"kinetic_shared": engine})
        self.assertEqual(len(calls), 3)
        self.assertTrue((report["summary"].n_independent == 3).all())
        for kwargs in calls:
            self.assertEqual([kwargs[key] for key in ["assoc_window_start", "assoc_window_end", "dissoc_window_start", "dissoc_window_end"]], [32, 90, 110, 160])


if __name__ == "__main__":
    unittest.main()
