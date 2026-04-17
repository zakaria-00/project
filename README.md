# project

## Education-grade visible spectrum visualization

This repository now includes `spectrum_visualizer.py`, an educational tool that maps monochromatic wavelength to color using:

- **CIE 1931 2° color matching functions (CMFs)** for wavelength → CIE XYZ
- **XYZ → sRGB (D65)** conversion for display
- explicit **out-of-gamut detection** and **clipping to [0, 1]** for display output

It provides:

- an interactive **wavelength slider**
- a live **color swatch**
- **wavelength (nm)**, **sRGB (0–255)**, **HEX**, and **CIE XYZ** readouts
- a full **spectrum strip** with a cursor at the selected wavelength

> Note: Mapping a wavelength to display RGB is device/gamut dependent. sRGB is only one display space and cannot represent all spectral colors.

## Install

```bash
pip install colour-science matplotlib numpy ipywidgets
```

## Common import error (`colour` vs `colour-science`)

If you see errors like `cannot import name 'SpectralShape' from 'colour'`, you likely installed the wrong package (`colour`) instead of `colour-science`.

Fix:

```bash
pip uninstall -y colour colour-science
pip install colour-science
```

Verify what is imported:

```bash
python -c "import colour; print(colour.__file__)"
```

Expected path ends with something like:

- `.../site-packages/colour/__init__.py`

Not:

- `.../site-packages/colour.py`

## Usage

### Script / desktop (matplotlib slider)

```bash
python spectrum_visualizer.py --mode matplotlib
```

### Jupyter (ipywidgets)

```python
from spectrum_visualizer import launch_jupyter_widget
launch_jupyter_widget()
```

### Save a preview image

```bash
python spectrum_visualizer.py --mode preview --output spectrum_preview.png --wavelength 555
```

## Smoke check

Run:

```bash
python smoke_check.py
```

It validates:

- dependency imports
- finite XYZ values from wavelength conversion
- clipped sRGB values remain in `[0, 1]`
