"""Cut the supplied artwork out of its grey paper background -> alpha mask, vector cut path, A4 imposition PDFs."""
import cv2, numpy as np
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from PIL import Image
im = cv2.imread("source_artwork.jpg"); h, w = im.shape[:2]
# background = low-saturation grey connected to the border; the gold outline closes the shape
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
bgish = ((np.abs(im.astype(int) - 237).max(axis=2) < 18)).astype(np.uint8)
n, lab = cv2.connectedComponents(bgish, connectivity=4)
border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1]); border.discard(0)
bg = np.isin(lab, list(border))
shape = (~bg).astype(np.uint8) * 255
cnts, _ = cv2.findContours(shape, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cnts, key=cv2.contourArea)
mask = np.zeros_like(shape); cv2.drawContours(mask, [c], -1, 255, -1)
x, y, bw, bh = cv2.boundingRect(c); print("bbox", x, y, bw, bh)
TW = 70.0; pxmm = bw / TW                      # source px per mm at 70 mm width
print("native dpi at 70mm:", round(pxmm * 25.4))
BLEED = 3.0; pad = int(round(BLEED * pxmm)) + 2
# bleed: dilate the cut shape by 3 mm and fill the ring with the edge-colour (cream paper)
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*pad+1, 2*pad+1))
big = cv2.dilate(mask, k)
paper = np.median(im[mask > 0].reshape(-1, 3)[::50], axis=0)
art = im.copy(); ring = (big > 0) & (mask == 0)
# inpaint-free: use the mean colour of a thin band just inside the outline
art[ring] = np.array([241, 245, 245])   # BGR cream
art[big == 0] = 255
art = cv2.copyMakeBorder(art, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(255, 255, 255))
crop = art[y:y+bh+2*pad, x:x+bw+2*pad]
cv2.imwrite("out/tag_art_bleed.png", crop)
# vector cut path (mm, origin = tag bbox centre), simplified
eps = 0.25 * pxmm / 10
ap = cv2.approxPolyDP(c, 0.6, True)[:, 0, :].astype(float)
cx, cy = x + bw/2, y + bh/2
pts_mm = [((px-cx)/pxmm, (py-cy)/pxmm) for px, py in ap]
cw = (bw + 2*pad) / pxmm; ch = (bh + 2*pad) / pxmm
ox_img = (max(x-pad,0) + crop.shape[1]/2) - cx; oy_img = (max(y-pad,0) + crop.shape[0]/2) - cy
CW, CH = cw + 2, ch + 2
cols, rows = 2, 3
ox, oy = (210 - cols*CW)/2, (297 - rows*CH)/2
def sheet(path, with_art):
    cv = canvas.Canvas(path, pagesize=(210*mm, 297*mm)); img = ImageReader("out/tag_art_bleed.png")
    for r in range(rows):
        for q in range(cols):
            mx, my = ox + CW*(q+.5), oy + CH*(r+.5)            # tag centre (mm from top-left)
            if with_art:
                cv.drawImage(img, (mx-cw/2)*mm, (297-my-ch/2)*mm, cw*mm, ch*mm)
            else:
                cv.setStrokeColorCMYK(0, 1, 0, 0); cv.setLineWidth(.25)
                p = cv.beginPath()
                for i, (px, py) in enumerate(pts_mm):
                    X, Y = (mx+px-0)*mm, (297-(my+py))*mm
                    # shift: crop centre vs shape centre
                    X += 0; 
                    (p.moveTo if i == 0 else p.lineTo)(X - ox_img/pxmm*mm*0, Y)
                p.close(); cv.drawPath(p, stroke=1, fill=0)
    if with_art:
        cv.setLineWidth(.15)
        for q in range(cols):
            x0 = (ox + CW*(q+.5))*mm
            for a, b in ((4, 9), (288, 293)): cv.line(x0, (297-a)*mm, x0, (297-b)*mm)
        for r in range(rows):
            y0 = (297 - (oy + CH*(r+.5)))*mm
            for a, b in ((4, 9), (201, 206)): cv.line(a*mm, y0, b*mm, y0)
    cv.save()
sheet("out/zainab-tag_ref_print_A4_x6.pdf", True)
sheet("out/zainab-tag_ref_cutline_A4_x6.pdf", False)
print("tag mm", round(cw,1), round(ch,1), "incl bleed")
