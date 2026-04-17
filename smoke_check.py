from __future__ import annotations

import sys

import numpy as np


def main() -> int:
    try:
        import colour
        from spectrum_visualizer import wavelength_to_xyz, xyz_to_srgb
    except Exception as exc:
        print(f"Dependency import failed: {exc}")
        return 1

    print(f"colour imported from: {colour.__file__}")

    xyz = wavelength_to_xyz(555)
    if not np.all(np.isfinite(xyz)):
        print(f"wavelength_to_xyz produced non-finite values: {xyz}")
        return 1

    _, rgb_clipped, _ = xyz_to_srgb(xyz)
    if not np.all(np.isfinite(rgb_clipped)):
        print(f"xyz_to_srgb produced non-finite values: {rgb_clipped}")
        return 1

    if np.any((rgb_clipped < 0.0) | (rgb_clipped > 1.0)):
        print(f"xyz_to_srgb clipping failed, values outside [0,1]: {rgb_clipped}")
        return 1

    print("Smoke check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
