"""Package only the reviewed deployment files; never include local datasets or secrets."""

import argparse
import hashlib
import json
from pathlib import Path
import zipfile


ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "app.py", "mixa_app.py", "mixa_competition.py", "mixa_data.py", "mixa_workspace.py", "mixa_reporting.py",
    "mixa_figures.py", "mixa_selection.py", "mixa_science.py", "mixa_diagnostics.py", "SCIENTIFIC_HARDENING.md",
    "mixa_mechanisms.py", "mixa_mechanistic_ui.py", "mixa_automation.py", "mixa_assistant_ui.py", "ASSISTED_FITTING.md", "ADVANCED_KINETICS.md", "DIAGNOSTICS_REVIEW.md",
    "mixa_methods.py", "mixa_education.py", "METHODS_VALIDATION.md", "audits/validate_methods.py",
    "validation/reference_simulator.py", "validation/benchmark_summary.json", "validation/RESULTS.md",
    "validation/conditional_intervals.csv", "validation/held_out_predictions.csv", "validation/automated_runs.json",
    "validation/post_selection_intervals.csv", "tests/test_methods_validation.py", "tests/test_education_workflow.py",
    "mixa_uncertainty.py", "tests/test_baseline_uncertainty.py", "audits/validate_baseline_uncertainty.py", "BASELINE_UNCERTAINTY.md",
    "mixa_input_uncertainty.py", "INPUT_UNCERTAINTY.md", "tests/test_input_uncertainty.py", "tests/test_input_workflow.py",
    "mixa_documentation.py", "USER_GUIDE.md", "tests/test_documentation.py",
    "mixa_inference.py", "mixa_inference_ui.py", "mixa_inference_figures.py", "mixa_residual_tests.py", "mixa_plotting.py",
    "REFIT_REVIEW.md", "pytest.ini", "tests/test_inference.py", "tests/test_refit_workflow.py", "tests/test_residual_tests.py",
    "mixa_calibration.py", "mixa_joint.py", "JOINT_INFERENCE.md", "FRONTIER_VALIDATION.md", "CHANGES_0.5.10.txt",
    "tests/test_calibration.py", "tests/test_joint.py", "tests/test_solver_performance.py", "audits/validate_frontier.py", "audits/summarize_frontier.py",
    "validation/frontier_calibration/results.json", "validation/frontier_calibration/RESULTS.md",
    "validation/frontier_calibration/intervals.csv", "validation/frontier_calibration/runs.json",
    "validation/frontier_performance/results.json", "validation/frontier_performance/RESULTS.md",
    "validation/frontier_performance/blind_estimates.csv", "validation/frontier_performance/prediction_accuracy.csv", "validation/frontier_performance/runs.json",
    "validation/frontier_performance/scientific_audit_checks.json",
    "validation/frontier_joint/results.json", "validation/frontier_joint/RESULTS.md", "validation/frontier_joint/intervals.csv",
    "validation/frontier_joint/all_parameters.csv", "validation/frontier_joint/runs.json",
    "validation/frontier_joint_sbc/results.json", "validation/frontier_joint_sbc/RESULTS.md", "validation/frontier_joint_sbc/ranks.csv", "validation/frontier_joint_sbc/runs.json",
    "validation/frontier_joint_initial/results.json", "validation/frontier_joint_initial/RESULTS.md", "validation/frontier_joint_initial/intervals.csv",
    "validation/frontier_joint_initial/all_parameters.csv", "validation/frontier_joint_initial/runs.json",
    "validation/frontier_joint_mala_initial/results.json", "validation/frontier_joint_mala_initial/RESULTS.md", "validation/frontier_joint_mala_initial/intervals.csv",
    "validation/frontier_joint_mala_initial/all_parameters.csv", "validation/frontier_joint_mala_initial/runs.json",
    "validation/frontier_joint_preconditioner_initial/results.json", "validation/frontier_joint_preconditioner_initial/RESULTS.md", "validation/frontier_joint_preconditioner_initial/intervals.csv",
    "validation/frontier_joint_preconditioner_initial/all_parameters.csv", "validation/frontier_joint_preconditioner_initial/runs.json",
    "validation/frontier_joint_sbc_preconditioner_initial/results.json", "validation/frontier_joint_sbc_preconditioner_initial/RESULTS.md", "validation/frontier_joint_sbc_preconditioner_initial/ranks.csv", "validation/frontier_joint_sbc_preconditioner_initial/runs.json",
    "validation/frontier_source_capsule/validate_frontier_initial.py", "validation/frontier_source_capsule/README.md",
    "audits/validate_refit_review.py", "audits/validate_assisted_comparison.py",
    "validation/refit_review/RESULTS.md", "validation/refit_review/results.json", "validation/refit_review/intervals.csv",
    "validation/refit_review/simulation_runs.json", "validation/refit_review/blind_estimates.csv", "validation/refit_review/blind_runs.json",
    "validation/refit_review/scientific_audit_checks.json",
    "validation/refit_review_percentile_initial/RESULTS.md", "validation/refit_review_percentile_initial/results.json",
    "validation/refit_review_percentile_initial/intervals.csv", "validation/refit_review_percentile_initial/simulation_runs.json",
    "validation/refit_review_percentile_initial/blind_estimates.csv", "validation/refit_review_percentile_initial/blind_runs.json",
    "validation/assisted_comparison/RESULTS.md", "validation/assisted_comparison/results.json", "validation/assisted_comparison/runs.json",
    "validation/assisted_comparison_initial/RESULTS.md", "validation/assisted_comparison_initial/results.json", "validation/assisted_comparison_initial/runs.json",
    "validation/refit_review_source_capsule/mixa_automation.py",
    "validation/refit_review_source_capsule/README.md", "CHANGES_0.5.9.txt",
    "audits/validate_input_uncertainty.py", "validation/input_uncertainty/results.json", "validation/input_uncertainty/RESULTS.md",
    "validation/input_uncertainty/input_intervals.csv", "validation/input_uncertainty/advanced_intervals.csv", "validation/input_uncertainty/advanced_runs.json",
    "validation/baseline_uncertainty/RESULTS.md", "validation/baseline_uncertainty/results.json",
    "validation/baseline_uncertainty/paired_intervals.csv", "validation/baseline_uncertainty/original_automatic_intervals.csv",
    "requirements.txt", "README.md", "LICENSE", "CITATION.cff", "PAPER.md", "PUBLICATION_FIGURES_AND_LEGENDS.md", "mixa_cli.py", ".streamlit/config.toml",
    "data/competition_MCAM_LM411_ITGA6B1/MCAM_20nM_LM411_vs_ITGA6B1_rep1.csv",
    "data/competition_MCAM_LM411_ITGA6B1/MCAM_20nM_LM411_vs_ITGA6B1_rep2.csv",
    "data/competition_MCAM_LM411_ITGA6B1/MCAM_20nM_LM411_vs_ITGA6B1_rep3.csv",
    "data/kinetics_MCAM_LM411/MCAM_LM411_kinetics_rep1.csv",
    "data/kinetics_MCAM_LM411/MCAM_LM411_kinetics_rep2.csv",
    "data/kinetics_MCAM_LM411/MCAM_LM411_kinetics_rep3.csv",
    "data/kinetics_MCAM_LM411/mcam_lm411_two_site_fit.pkl",
    "data/kinetics_MCAM_LM411/mcam_lm411_two_site_fit.b64.txt",
    "data/kinetics_MCAM_LamA4G123/MCAM_LamA4G123_kinetics_rep1.csv",
    "data/kinetics_MCAM_LamA4G123/MCAM_LamA4G123_kinetics_rep2.csv",
    "data/kinetics_MCAM_LamA4G123/MCAM_LamA4G123_kinetics_rep3.csv",
    "data/kinetics_MCAM_LamA4G123/mcam_lama4g123_two_site_fit.pkl",
    "data/kinetics_MCAM_LamA4G123/mcam_lama4g123_two_site_fit.b64.txt",
    "publication_outputs/lm411_kinetics_parameters_and_errors.csv",
    "publication_outputs/lama4g123_kinetics_parameters_and_errors.csv",
    "publication_outputs/lama4g123_capacity_ceiling_sensitivity.csv",
    "publication_outputs/competition_parameters_and_errors.csv",
    "publication_outputs/supp_table_quantitative_construct_comparison.csv",
    "publication_outputs/table_1_construct_kinetics_comparison_full.png",
    "publication_outputs/table_1_construct_kinetics_comparison_full.pdf",
    "publication_outputs/table_1_construct_kinetics_comparison_notitle.png",
    "publication_outputs/table_1_construct_kinetics_comparison_notitle.pdf",
    "publication_outputs/table_2_itga6b1_solution_inhibition_full.png",
    "publication_outputs/table_2_itga6b1_solution_inhibition_full.pdf",
    "publication_outputs/table_2_itga6b1_solution_inhibition_notitle.png",
    "publication_outputs/table_2_itga6b1_solution_inhibition_notitle.pdf",
    "publication_outputs/table_3_intact_lm411_per_curve_kinetics_full.png",
    "publication_outputs/table_3_intact_lm411_per_curve_kinetics_full.pdf",
    "publication_outputs/table_3_intact_lm411_per_curve_kinetics_notitle.png",
    "publication_outputs/table_3_intact_lm411_per_curve_kinetics_notitle.pdf",
    "publication_outputs/table_4_isolated_lama4g123_per_curve_kinetics_full.png",
    "publication_outputs/table_4_isolated_lama4g123_per_curve_kinetics_full.pdf",
    "publication_outputs/table_4_isolated_lama4g123_per_curve_kinetics_notitle.png",
    "publication_outputs/table_4_isolated_lama4g123_per_curve_kinetics_notitle.pdf",
    "publication_outputs/Response_to_Reviewer_1.pdf",
    "publication_outputs/Response_to_Reviewer_1.docx",
    "publication_outputs/Supplementary_Tables_MCAM_Laminin411.docx",
    "publication_outputs/Supplementary_Tables_MCAM_Laminin411.xlsx",
    "publication_outputs/final_mcam_lm411_binding_kinetics.png",
    "publication_outputs/final_mcam_lm411_itga6b1_inhibition.png",
    "publication_outputs/lm411_kinetics_panel_1to1_full.png",
    "publication_outputs/lm411_kinetics_panel_1to1_full.pdf",
    "publication_outputs/lm411_kinetics_panel_1to1_notitle.png",
    "publication_outputs/lm411_kinetics_panel_1to1_notitle.pdf",
    "publication_outputs/lama4g123_kinetics_panel_full.png",
    "publication_outputs/lama4g123_kinetics_panel_full.pdf",
    "publication_outputs/lama4g123_kinetics_panel_notitle.png",
    "publication_outputs/lama4g123_kinetics_panel_notitle.pdf",
    "publication_outputs/lama4g123_kinetics_panel_1to1_full.png",
    "publication_outputs/lama4g123_kinetics_panel_1to1_full.pdf",
    "publication_outputs/lama4g123_kinetics_panel_1to1_notitle.png",
    "publication_outputs/lama4g123_kinetics_panel_1to1_notitle.pdf",
    "publication_outputs/conclusion_mechanistic_model_full.png",
    "publication_outputs/conclusion_mechanistic_model_notitle.pdf",
    "publication_outputs/conclusion_mechanistic_model_notitle.svg",
    "publication_outputs/conclusion_mechanistic_model_notitle.png",
    "publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.pdf",
    "publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.svg",
    "publication_outputs/conclusion_panel_A_2D_cell_migration_notitle.png",
    "publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.pdf",
    "publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.svg",
    "publication_outputs/conclusion_panel_B_3D_soluble_mcam_block_notitle.png",
    "CHANGES_0.5.txt", "DEPLOYMENT_STATUS.md",
    "tests/test_analysis.py", "tests/test_selection.py", "tests/test_figures.py", "tests/test_workflow.py",
    "tests/test_scientific_hardening.py", "audits/scientific_audit.py", "audits/review_20261019.py",
    "tests/test_automation.py", "tests/test_assisted_workflow.py", "SCIENTIFIC_AUDIT_2026-10-19.md",
    "tests/test_mechanisms.py", "tests/test_mechanistic_workflow.py", "tests/test_diagnostics.py", "tests/test_competition.py", "audits/mechanistic_validation.py",
    "scripts/build_release.py", "scripts/preview_analysis.py", "scripts/preview_mechanistic.py", "scripts/preview_diagnostics.py",
]

# GitHub Web Upload enforces a hard limit of <= 100 files per drag-and-drop upload and <= 25 MB per file.
# Keep MIXAGIT_FILES at 74 files total (leaving >25-file buffer even if macOS Finder adds .DS_Store files)
# containing 100% of the runnable MIXA app, bundled MCAM-LM411/LamA4G123/ITGA6B1 datasets & native fits,
# key publication outputs, docs, and core tests.
MIXAGIT_FILES = [
    "app.py", "mixa_app.py", "mixa_competition.py", "mixa_data.py", "mixa_workspace.py", "mixa_reporting.py",
    "mixa_figures.py", "mixa_selection.py", "mixa_science.py", "mixa_diagnostics.py",
    "mixa_mechanisms.py", "mixa_mechanistic_ui.py", "mixa_automation.py", "mixa_assistant_ui.py",
    "mixa_methods.py", "mixa_education.py", "mixa_uncertainty.py", "mixa_input_uncertainty.py",
    "mixa_documentation.py", "mixa_inference.py", "mixa_inference_ui.py", "mixa_inference_figures.py",
    "mixa_residual_tests.py", "mixa_plotting.py", "mixa_calibration.py", "mixa_joint.py", "mixa_cli.py",
    ".streamlit/config.toml", "requirements.txt", "README.md", "LICENSE", "CITATION.cff", "pytest.ini",
    "USER_GUIDE.md", "PAPER.md", "PUBLICATION_FIGURES_AND_LEGENDS.md",
    "data/competition_MCAM_LM411_ITGA6B1/MCAM_20nM_LM411_vs_ITGA6B1_rep1.csv",
    "data/competition_MCAM_LM411_ITGA6B1/MCAM_20nM_LM411_vs_ITGA6B1_rep2.csv",
    "data/competition_MCAM_LM411_ITGA6B1/MCAM_20nM_LM411_vs_ITGA6B1_rep3.csv",
    "data/kinetics_MCAM_LM411/MCAM_LM411_kinetics_rep1.csv",
    "data/kinetics_MCAM_LM411/MCAM_LM411_kinetics_rep2.csv",
    "data/kinetics_MCAM_LM411/MCAM_LM411_kinetics_rep3.csv",
    "data/kinetics_MCAM_LM411/mcam_lm411_two_site_fit.b64.txt",
    "data/kinetics_MCAM_LamA4G123/MCAM_LamA4G123_kinetics_rep1.csv",
    "data/kinetics_MCAM_LamA4G123/MCAM_LamA4G123_kinetics_rep2.csv",
    "data/kinetics_MCAM_LamA4G123/MCAM_LamA4G123_kinetics_rep3.csv",
    "data/kinetics_MCAM_LamA4G123/mcam_lama4g123_two_site_fit.b64.txt",
    "publication_outputs/lm411_kinetics_parameters_and_errors.csv",
    "publication_outputs/lama4g123_kinetics_parameters_and_errors.csv",
    "publication_outputs/lama4g123_capacity_ceiling_sensitivity.csv",
    "publication_outputs/competition_parameters_and_errors.csv",
    "publication_outputs/supp_table_quantitative_construct_comparison.csv",
    "publication_outputs/Supplementary_Tables_MCAM_Laminin411.docx",
    "publication_outputs/Supplementary_Tables_MCAM_Laminin411.xlsx",
    "publication_outputs/final_mcam_lm411_binding_kinetics.png",
    "publication_outputs/final_mcam_lm411_itga6b1_inhibition.png",
    "publication_outputs/lama4g123_kinetics_panel_full.png",
    "publication_outputs/table_1_construct_kinetics_comparison_full.png",
    "publication_outputs/table_2_itga6b1_solution_inhibition_full.png",
    "publication_outputs/table_3_intact_lm411_per_curve_kinetics_full.png",
    "publication_outputs/table_4_isolated_lama4g123_per_curve_kinetics_full.png",
    "publication_outputs/conclusion_mechanistic_model_full.png",
    "scripts/build_release.py", "scripts/deploy_to_hf.py",
    "validation/benchmark_summary.json", "validation/reference_simulator.py",
    "tests/test_analysis.py", "tests/test_mechanisms.py", "tests/test_competition.py",
    "tests/test_scientific_hardening.py", "tests/test_inference.py", "tests/test_calibration.py",
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "release" / "MIXA_publication_preview.zip")
    destination = parser.parse_args().output
    destination.parent.mkdir(exist_ok=True)
    mixagit_dir = ROOT / "mixagit"
    hashes = {}
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in FILES:
            payload = (ROOT / name).read_bytes()
            hashes[name] = hashlib.sha256(payload).hexdigest()
            archive.writestr(name, payload)
        archive.writestr("SHA256.json", json.dumps(hashes, indent=2))
    if mixagit_dir.is_dir():
        allowed = set(MIXAGIT_FILES) | {"Dockerfile", "runtime.txt"}
        for existing in list(mixagit_dir.rglob("*")):
            if existing.is_file():
                rel = existing.relative_to(mixagit_dir).as_posix()
                if rel not in allowed:
                    existing.unlink()
        for existing_dir in sorted(mixagit_dir.rglob("*"), key=lambda p: len(p.parts), reverse=True):
            if existing_dir.is_dir() and not any(existing_dir.iterdir()):
                existing_dir.rmdir()
        for name in MIXAGIT_FILES:
            src = ROOT / name
            if src.is_file():
                target = mixagit_dir / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(src.read_bytes())
    print(destination)


if __name__ == "__main__":
    main()
