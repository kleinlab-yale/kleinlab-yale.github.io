import unittest
from unittest.mock import patch

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from mixa_figures import independent_summary, kinetic_repeat_points, publication_figures
from mixa_reporting import (analyze_repeats, plot_repeat_estimates, summarize_repeats,
                            parameter_results_table, parameter_results_text, plot_method_publication,
                            plot_curves_and_parameters)


class PublicationFigureTests(unittest.TestCase):
    def parameter_report(self, method="Kinetic", n=3):
        estimates = pd.DataFrame({"method": [method] * n, "repeat_id": list("ABC")[:n],
            "kon": [1.e5, 1.2e5, 1.4e5][:n], "koff": [.0028, .00396, .00532][:n],
            "KD_nM": [28., 33., 38.][:n], "status": ["Complete"] * n})
        if method == "Equilibrium":
            estimates[["kon", "koff"]] = np.nan
        return {"summary": summarize_repeats(estimates), "repeat_estimates": estimates}

    def test_readable_parameter_results_have_sd_units_and_independent_n(self):
        report = self.parameter_report()
        table = parameter_results_table(report)
        row = table.loc[table.parameter == "K_D"].iloc[0]
        self.assertEqual(row.result, "33.0 +/- 5.0 nM")
        self.assertEqual((row["mean"], row.sd, row.n_independent), (33., 5., 3))
        self.assertEqual(table.iloc[0].result, "(1.20 +/- 0.20) x 10^5 M^-1 s^-1")
        text = parameter_results_text(report)
        self.assertIn("K_D = 33.0 +/- 5.0 nM (Mean +/- SD, n=3)", text)
        # The reported K_D is the mean of repeat K_D estimates, not mean(koff)/mean(kon).
        self.assertNotEqual(row["mean"], report["summary"].iloc[1]["mean"] / report["summary"].iloc[0]["mean"] * 1e9)

    def test_numerical_single_repeat_and_boundary_results_do_not_invent_sd(self):
        report = self.parameter_report(n=1)
        text = parameter_results_text(report)
        self.assertIn("K_D = 28 nM (SD unavailable, n=1)", text)
        self.assertNotIn("+/- 0", text)
        report["repeat_estimates"].loc[:, "status"] = "Boundary estimate"
        report["summary"] = summarize_repeats(report["repeat_estimates"])
        table = parameter_results_table(report)
        self.assertTrue((table.result == "Not estimable").all())
        self.assertTrue((table.n_independent == 0).all())

    def test_true_zero_parameter_sd_remains_reported(self):
        report = self.parameter_report()
        report["repeat_estimates"]["KD_nM"] = 33.
        report["summary"] = summarize_repeats(report["repeat_estimates"])
        row = parameter_results_table(report).iloc[2]
        self.assertEqual(row.result, "33 +/- 0 nM")
        self.assertEqual(row.n_independent, 3)

    def test_separate_method_figures_show_only_their_parameters_at_both_widths(self):
        time = np.arange(6.)
        data = [{"filename": name, "repeat_id": name, "time": time,
                 "responses": {10.: time + i}} for i, name in enumerate("ABC")]
        fits = [{"filename": d["filename"], "concentration": 10., "fitted": time,
                 "fit_mask": np.ones(6, dtype=bool)} for d in data]
        kinetic = {"individual_fits": fits}
        responses = pd.DataFrame({"repeat_id": ["A", "B", "C"] * 2,
            "concentration": [10.] * 3 + [100.] * 3, "response": [1., 2., 3., 5., 6., 7.]})
        equilibrium = {"repeat_response_table": responses, "conc_fit": np.arange(110.),
            "response_fit": np.arange(110.) / 15., "attainment": {"equilibrium_reached": False}}
        estimates = pd.concat([self.parameter_report(method)["repeat_estimates"]
                               for method in ["Kinetic", "kobs", "Equilibrium"]], ignore_index=True)
        report = {"repeat_estimates": estimates, "summary": summarize_repeats(estimates)}
        for width in [89 / 25.4, 183 / 25.4]:
            a = plot_method_publication("Kinetic", kinetic, data, report, width)
            b = plot_method_publication("Equilibrium", equilibrium, [], report, width, log_concentration=True)
            combined = plot_curves_and_parameters({"Kinetic": kinetic, "Equilibrium": equilibrium}, data, report, width)
            try:
                for fig in [a, b, combined]:
                    fig.canvas.draw()
                    self.assertAlmostEqual(fig.get_figwidth(), width)
                self.assertEqual(len(a.axes), 7)
                self.assertEqual(len(b.axes), 3)
                self.assertEqual(len(combined.axes), 4)
                for panel, parameter in zip(a.axes[1:4], ["kon", "koff", "KD_nM"]):
                    # Actual repeat dots and SD whiskers must remain, not only text.
                    expected = report["repeat_estimates"].loc[estimates.method == "Kinetic", parameter].to_numpy()
                    np.testing.assert_allclose(panel.collections[0].get_offsets()[:, 1], expected)
                    segment = panel.collections[1].get_segments()[0]
                    np.testing.assert_allclose(segment[:, 1], np.mean(expected) + np.array([-1, 1]) * np.std(expected, ddof=1))
                    self.assertEqual([tick.get_text() for tick in panel.get_xticklabels()], ["Kinetic\nn=3"])
                self.assertEqual(b.axes[0].get_xscale(), "log")
                np.testing.assert_allclose(b.axes[1].collections[0].get_offsets()[:, 1], [28., 33., 38.])
                np.testing.assert_allclose(b.axes[1].collections[1].get_segments()[0][:, 1], [28., 38.])
                self.assertEqual(b.axes[1].get_title(), r"Apparent $K_D$")
                labels = [text.get_text() for ax in b.axes[2:] for text in ax.texts]
                self.assertIn(r"$33.0 \pm 5.0$", labels)
                self.assertFalse(any("k_{\\mathrm{on}}" in label for label in labels))
                self.assertIn("Fixed-time", b._supxlabel.get_text())
                self.assertEqual(len(combined.axes[1].collections), 4)
                self.assertEqual(len(combined.axes[3].collections), 6)
            finally:
                plt.close(a)
                plt.close(b)
                plt.close(combined)

    def test_boundary_rates_are_detected_without_rejecting_interior_rates(self):
        from mixa_app import kinetic_boundary_parameters
        self.assertEqual(kinetic_boundary_parameters(1.2e5, .012), [])
        self.assertEqual(kinetic_boundary_parameters(1.2e5, 1e-8), ["k_off"])
        self.assertEqual(kinetic_boundary_parameters(1e9, .012), ["k_on"])

    def test_boundary_repeat_is_retained_but_not_summarized_as_resolved(self):
        data = [{"filename": "one.csv", "repeat_id": "A"}]
        settings = {"binding_model_code": "1:1", "normalize_baseline": True,
                    "drift_correction": False, "include_nonspecific": False,
                    "rmax_group_mode": "Per file (repeat-specific)",
                    "phase_assoc_start_s": 20., "phase_dissoc_start_s": 100.}
        def fit(*args, **kwargs):
            return {"global_kon": 1.2e5, "global_koff": 1e-8, "global_KD": 1e-8 / 1.2e5,
                    "n_fits": 1, "boundary_parameters": ["k_off"]}
        parent = {"Kinetic": {"fit_settings": settings, "fit_strategy": "shared_kinetics"}}
        with patch("mixa_reporting.project_context", return_value={}):
            report = analyze_repeats(data, {"one.csv": {10.}}, parent, {"kinetic_shared": fit})
        self.assertEqual(report["repeat_estimates"].iloc[0].status, "Boundary estimate")
        self.assertTrue((report["summary"].n_independent == 0).all())
        self.assertTrue(report["summary"]["mean"].isna().all())
        self.assertTrue((report["summary"].excluded_or_failed == 1).all())
        figure = plot_repeat_estimates(report)
        try:
            figure.canvas.draw()
        finally:
            plt.close(figure)

    def test_technical_files_are_averaged_before_repeat_sd(self):
        table = pd.DataFrame({"repeat_id": ["A", "A", "B"], "x": [10] * 3, "response": [1., 3., 10.]})
        row = independent_summary(table, ["x"], "response").iloc[0]
        self.assertEqual(row.n_independent, 2)
        self.assertEqual(row["mean"], 6.)
        self.assertAlmostEqual(row.sd, np.std([2., 10.], ddof=1))
        self.assertAlmostEqual(row["sem"], 4.)

    def test_single_repeat_sd_is_missing_not_zero(self):
        table = pd.DataFrame({"repeat_id": ["A", "A"], "x": [10, 10], "response": [1., 3.]})
        row = independent_summary(table, ["x"], "response").iloc[0]
        self.assertEqual(row.n_independent, 1)
        self.assertTrue(np.isnan(row.sd))
        self.assertTrue(np.isnan(row["sem"]))

    def test_true_zero_between_repeat_sd_is_retained(self):
        table = pd.DataFrame({"repeat_id": ["A", "B"], "x": [10, 10], "response": [2., 2.]})
        row = independent_summary(table, ["x"], "response").iloc[0]
        self.assertEqual(row.sd, 0.)
        self.assertEqual(row.n_independent, 2)

    def test_kinetic_alignment_never_extrapolates_or_counts_technical_files(self):
        data, fits = [], []
        for name, repeat, time, value in [("a", "A", [0, 1, 2, 3], 1.),
                                           ("b", "A", [.5, 1.5, 2.5], 3.),
                                           ("c", "B", [1, 2, 3], 10.)]:
            data.append({"filename": name, "repeat_id": repeat, "time": np.asarray(time),
                         "responses": {10.: np.full(len(time), value)}})
            fits.append({"filename": name, "concentration": 10., "response_plot": np.full(len(time), value),
                         "fitted": np.full(len(time), value), "fit_mask": np.asarray(time) >= 1.5})
        table = kinetic_repeat_points({"individual_fits": fits}, data)
        self.assertEqual((table.time_s.min(), table.time_s.max()), (1., 2.5))
        summary = independent_summary(table, ["concentration_nM", "time_s"], "response")
        self.assertTrue((summary.n_independent == 2).all())
        np.testing.assert_allclose(summary["mean"], 6.)
        np.testing.assert_allclose(summary.sd, np.std([2., 10.], ddof=1))
        self.assertTrue((table.loc[table.repeat_id == "A", "n_technical"] == 2).all())
        self.assertFalse(table.loc[table.time_s == 1., "used_for_fit"].any())

    def test_equilibrium_source_data_and_print_sized_figures(self):
        unit = pd.DataFrame({"repeat_id": ["A", "B", "A", "B"],
                             "concentration": [10., 10., 100., 100.], "response": [2., 4., 6., 10.]})
        result = {"repeat_response_table": unit, "conc_fit": np.linspace(0, 120, 10),
                  "response_fit": np.linspace(0, 10, 10)}
        figures, points = publication_figures({"Equilibrium": result}, [], width=89 / 25.4)
        try:
            table = points["equilibrium_mean_sd"]
            np.testing.assert_allclose(table["mean"], [3., 8.])
            np.testing.assert_allclose(table.sd, [np.sqrt(2), np.sqrt(8)])
            self.assertTrue((table.n_independent == 2).all())
            self.assertAlmostEqual(figures["equilibrium"].get_figwidth() * 25.4, 89.)
            self.assertEqual(figures["equilibrium"].axes[0].get_title(), "")
            self.assertEqual(figures["equilibrium_log_concentration"].axes[0].get_xscale(), "log")
        finally:
            for figure in figures.values():
                plt.close(figure)

    def test_arithmetic_variability_is_separate_from_log_confidence_interval(self):
        estimates = pd.DataFrame({"method": ["Kinetic"] * 3, "repeat_id": ["A", "B", "C"],
            "kon": [1., 2., 4.], "koff": [1., 2., 4.], "KD_nM": [1., 2., 4.], "status": ["Complete"] * 3})
        table = summarize_repeats(estimates)
        row = table.iloc[0]
        self.assertAlmostEqual(row["mean"], 7 / 3)
        self.assertAlmostEqual(row.sd, np.std([1., 2., 4.], ddof=1))
        self.assertAlmostEqual(row["sem"], np.std([1., 2., 4.], ddof=1) / np.sqrt(3))
        self.assertAlmostEqual(row.geometric_mean, 2.)
        report = {"summary": table, "repeat_estimates": estimates}
        a = plot_repeat_estimates(report)
        b = plot_repeat_estimates(report, statistic="Geometric mean + 95% CI")
        try:
            self.assertEqual(a.axes[0].get_yscale(), "linear")
            self.assertEqual(b.axes[0].get_yscale(), "log")
        finally:
            plt.close(a)
            plt.close(b)


if __name__ == "__main__":
    unittest.main()
