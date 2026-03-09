# ALK activation by ALKAL

This workspace contains a small self-contained static viewer that mirrors the presentation style of
the ROS1 mechanistic site, but swaps in the ALK / ALKAL activation logic.

## Files

- `index.html`: page shell and explanatory copy
- `styles.css`: the shared visual language adapted from the ROS1 viewer
- `model.js`: canvas-based mechanistic cartoon and interaction logic

## States

- `Unliganded`: separated ALK monomers without the productive membrane-gap ligand pocket
- `ALKAL in gap`: the EGF-like spacer lifts the GRD off the membrane and ALKAL nests in that slot
- `Symmetric dimer`: a small exposed ALKAL surface helps stabilize the neighboring ALK complex,
  producing the signaling dimer

## Notes

This is a mechanistic cartoon, not an atomically precise structural viewer. The emphasis is on the
membrane-parallel GRD pose, the spacing role of the EGF-like domain, and the ligand-assisted
symmetric dimer interface described across the two ALK papers.
