from __future__ import annotations

import argparse
from dataclasses import dataclass
from functools import lru_cache
from typing import Tuple

import numpy as np

try:
    import colour
    from colour.colorimetry import MSDS_CMFS
    from colour.models import XYZ_to_sRGB
    try:
        from colour import SpectralShape
    except (ImportError, AttributeError):  # pragma: no cover - version compatibility path
        from colour.colorimetry import SpectralShape
except ImportError as exc:  # pragma: no cover - import-time dependency diagnostics
    raise ImportError(
        "This tool requires the 'colour-science' package (import name 'colour'). "
        "If you accidentally installed the unrelated 'colour' module, uninstall it and "
        "install 'colour-science'."
    ) from exc

VISIBLE_MIN_NM = 380
VISIBLE_MAX_NM = 780


@dataclass(frozen=True)
class DisplayColor:
    wavelength_nm: float
    xyz: np.ndarray
    srgb_unclipped: np.ndarray
    srgb_clipped: np.ndarray

    @property
    def out_of_gamut(self) -> bool:
        return bool(np.any((self.srgb_unclipped < 0.0) | (self.srgb_unclipped > 1.0)))

    @property
    def srgb_255(self) -> Tuple[int, int, int]:
        values = np.clip(np.round(self.srgb_clipped * 255.0), 0, 255).astype(int)
        return int(values[0]), int(values[1]), int(values[2])

    @property
    def hex(self) -> str:
        r, g, b = self.srgb_255
        return f"#{r:02X}{g:02X}{b:02X}"


@lru_cache(maxsize=1)
def _cmfs_aligned():
    shape = SpectralShape(VISIBLE_MIN_NM, VISIBLE_MAX_NM, 1)
    cmfs = MSDS_CMFS["CIE 1931 2 Degree Standard Observer"].copy().align(shape)
    wavelengths = np.arange(VISIBLE_MIN_NM, VISIBLE_MAX_NM + 1, 1, dtype=float)
    return wavelengths, np.asarray(cmfs.values, dtype=float)


def wavelength_to_xyz(wavelength_nm: float) -> np.ndarray:
    """Convert a monochromatic wavelength to CIE XYZ using CIE 1931 2° CMFs."""
    if not (VISIBLE_MIN_NM <= wavelength_nm <= VISIBLE_MAX_NM):
        raise ValueError(f"wavelength_nm must be in [{VISIBLE_MIN_NM}, {VISIBLE_MAX_NM}].")

    wavelengths, cmf_values = _cmfs_aligned()
    x = np.interp(wavelength_nm, wavelengths, cmf_values[:, 0])
    y = np.interp(wavelength_nm, wavelengths, cmf_values[:, 1])
    z = np.interp(wavelength_nm, wavelengths, cmf_values[:, 2])
    return np.array([x, y, z], dtype=float)


def xyz_to_srgb(xyz: np.ndarray) -> tuple[np.ndarray, np.ndarray, bool]:
    """
    Convert CIE XYZ to display sRGB (D65).

    Gamut handling strategy:
    - Flag if any channel is outside [0, 1] before clipping.
    - Clip to [0, 1] for display output.
    """
    xyz = np.asarray(xyz, dtype=float)
    rgb_unclipped = np.asarray(XYZ_to_sRGB(xyz), dtype=float)
    out_of_gamut = bool(np.any((rgb_unclipped < 0.0) | (rgb_unclipped > 1.0)))
    rgb_clipped = np.clip(rgb_unclipped, 0.0, 1.0)
    return rgb_unclipped, rgb_clipped, out_of_gamut


def wavelength_to_display_color(wavelength_nm: float) -> DisplayColor:
    xyz = wavelength_to_xyz(wavelength_nm)
    rgb_unclipped, rgb_clipped, _ = xyz_to_srgb(xyz)
    return DisplayColor(
        wavelength_nm=float(wavelength_nm),
        xyz=xyz,
        srgb_unclipped=rgb_unclipped,
        srgb_clipped=rgb_clipped,
    )


def _spectrum_strip():
    wavelengths = np.arange(VISIBLE_MIN_NM, VISIBLE_MAX_NM + 1, 1, dtype=float)
    rgb = []
    for w in wavelengths:
        rgb.append(wavelength_to_display_color(float(w)).srgb_clipped)
    return wavelengths, np.array(rgb, dtype=float)


def launch_jupyter_widget(initial_wavelength: int = 555) -> None:
    """Interactive Jupyter UI (ipywidgets)."""
    from IPython.display import display
    from ipywidgets import HTML, FloatSlider, VBox, Output
    import matplotlib.pyplot as plt

    wavelengths, strip = _spectrum_strip()
    spectrum_img = strip[np.newaxis, :, :]

    out = Output()
    fig, ax = plt.subplots(figsize=(10, 2.8))
    ax.imshow(
        spectrum_img,
        aspect="auto",
        extent=[wavelengths.min(), wavelengths.max(), 0, 1],
        origin="lower",
    )
    ax.set_yticks([])
    ax.set_xlabel("Wavelength (nm)")
    ax.set_title("Visible Spectrum (CIE 1931 2° → XYZ → sRGB D65, clipped to gamut)")
    cursor = ax.axvline(initial_wavelength, color="black", lw=2)

    swatch = HTML()
    details = HTML()

    def update(w: float):
        color = wavelength_to_display_color(float(w))
        cursor.set_xdata([w, w])
        r, g, b = color.srgb_255
        oog_text = "Yes" if color.out_of_gamut else "No"
        oog_color = "#B00020" if color.out_of_gamut else "#1B5E20"

        swatch.value = (
            f"<div style='width:120px;height:54px;border:1px solid #444;"
            f"background:{color.hex};'></div>"
        )
        details.value = (
            f"<div><b>Wavelength:</b> {color.wavelength_nm:.1f} nm</div>"
            f"<div><b>sRGB:</b> ({r}, {g}, {b}) | <b>HEX:</b> {color.hex}</div>"
            f"<div><b>CIE XYZ:</b> ({color.xyz[0]:.6f}, {color.xyz[1]:.6f}, {color.xyz[2]:.6f})</div>"
            f"<div><b>Out of sRGB gamut:</b> <span style='color:{oog_color};'>{oog_text}</span></div>"
        )

        with out:
            out.clear_output(wait=True)
            display(fig)

    slider = FloatSlider(
        value=float(initial_wavelength),
        min=float(VISIBLE_MIN_NM),
        max=float(VISIBLE_MAX_NM),
        step=1.0,
        description="λ (nm)",
        continuous_update=True,
        readout_format=".0f",
        layout={"width": "850px"},
    )
    slider.observe(lambda change: update(change["new"]), names="value")

    update(slider.value)
    display(VBox([slider, swatch, details, out]))


def create_matplotlib_figure(initial_wavelength: int = 555):
    import matplotlib.pyplot as plt
    from matplotlib.widgets import Slider

    wavelengths, strip = _spectrum_strip()
    spectrum_img = strip[np.newaxis, :, :]

    fig = plt.figure(figsize=(11, 4.2))
    ax_spectrum = fig.add_axes([0.08, 0.55, 0.84, 0.25])
    ax_swatch = fig.add_axes([0.08, 0.2, 0.2, 0.2])
    ax_slider = fig.add_axes([0.08, 0.08, 0.84, 0.05])

    ax_spectrum.imshow(
        spectrum_img,
        aspect="auto",
        extent=[wavelengths.min(), wavelengths.max(), 0, 1],
        origin="lower",
    )
    ax_spectrum.set_xlim(VISIBLE_MIN_NM, VISIBLE_MAX_NM)
    ax_spectrum.set_yticks([])
    ax_spectrum.set_xlabel("Wavelength (nm)")
    ax_spectrum.set_title("Visible Spectrum (CIE 1931 2° → XYZ → sRGB D65, clipped)")

    cursor = ax_spectrum.axvline(initial_wavelength, color="black", lw=2)

    ax_swatch.set_xticks([])
    ax_swatch.set_yticks([])
    swatch_patch = ax_swatch.add_patch(plt.Rectangle((0, 0), 1, 1, color="#000000", transform=ax_swatch.transAxes))

    text = fig.text(0.33, 0.2, "", fontsize=10, family="monospace", va="bottom")

    slider = Slider(ax=ax_slider, label="λ (nm)", valmin=VISIBLE_MIN_NM, valmax=VISIBLE_MAX_NM, valinit=initial_wavelength, valstep=1)

    def update(val):
        color = wavelength_to_display_color(float(val))
        cursor.set_xdata([val, val])
        swatch_patch.set_color(color.hex)
        r, g, b = color.srgb_255
        text.set_text(
            f"Wavelength: {color.wavelength_nm:6.1f} nm\n"
            f"sRGB: ({r:3d}, {g:3d}, {b:3d})  HEX: {color.hex}\n"
            f"CIE XYZ: ({color.xyz[0]:.6f}, {color.xyz[1]:.6f}, {color.xyz[2]:.6f})\n"
            f"Out of sRGB gamut: {'Yes' if color.out_of_gamut else 'No'}"
        )
        fig.canvas.draw_idle()

    slider.on_changed(update)
    update(initial_wavelength)
    return fig


def launch_matplotlib_slider(initial_wavelength: int = 555) -> None:
    import matplotlib.pyplot as plt

    fig = create_matplotlib_figure(initial_wavelength=initial_wavelength)
    plt.show()


def save_preview(path: str, wavelength_nm: int = 555) -> None:
    fig = create_matplotlib_figure(initial_wavelength=wavelength_nm)
    fig.savefig(path, dpi=150, bbox_inches="tight")


def main() -> None:
    parser = argparse.ArgumentParser(description="Education-grade visible spectrum visualizer.")
    parser.add_argument("--mode", choices=["matplotlib", "jupyter", "preview"], default="matplotlib")
    parser.add_argument("--wavelength", type=int, default=555)
    parser.add_argument("--output", type=str, default="spectrum_preview.png")
    args = parser.parse_args()

    if args.mode == "matplotlib":
        launch_matplotlib_slider(initial_wavelength=args.wavelength)
    elif args.mode == "jupyter":
        launch_jupyter_widget(initial_wavelength=args.wavelength)
    else:
        save_preview(path=args.output, wavelength_nm=args.wavelength)
        print(f"Saved preview image to {args.output}")


if __name__ == "__main__":
    main()
