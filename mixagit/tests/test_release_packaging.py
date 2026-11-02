import hashlib
import io
import json
import zipfile

from scripts.build_release import build_source_bundle


def test_source_archive_is_reproducible_complete_and_excludes_session_files():
    first = build_source_bundle()
    assert first == build_source_bundle()
    with zipfile.ZipFile(io.BytesIO(first)) as archive:
        assert archive.testzip() is None
        names = set(archive.namelist())
        assert {"mixa_mechanisms.py", "tests/test_contact_transport.py", "audits/validate_contact_transport.py",
                "validation/contact_transport/reference.json", "data/kinetics_MCAM_LM411/MCAM_LM411_kinetics_rep1.csv"} <= names
        assert not any(name.startswith((".git/", ".env", "release/", "publication_outputs/")) for name in names)
        assert not any(name.endswith(".pkl") for name in names)
        assert "data/kinetics_MCAM_LM411/mcam_lm411_two_site_fit.b64.txt" in names
        hashes = json.loads(archive.read("SHA256.json"))
        assert set(hashes) == names-{"SHA256.json", "SOURCE_RELEASE.json"}
        assert all(hashlib.sha256(archive.read(name)).hexdigest()==digest for name, digest in hashes.items())
