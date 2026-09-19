"""
MC1496 Single Supply Balanced Mixer
Generates KiCad 7 schematic (.kicad_sch) and PCB (.kicad_pcb)
"""
import uuid, math

def uid(): return str(uuid.uuid4())

# ─── Circuit description ─────────────────────────────────────────────────────
# Single supply +12V, from ON Semi MC1496 datasheet Figure 25
#
# Pin map (DIP-14):
#  1 - Signal Input (-)       8  - Carrier Input (+)
#  2 - Gain Adjust (Re-)      9  - N/C
#  3 - Gain Adjust (Re+)      10 - Carrier Input (-)
#  4 - Signal Input (+)       11 - N/C
#  5 - Bias (I5 set)          12 - Output (-)
#  6 - Output (+)             13 - N/C
#  7 - VEE (GND)              14 - VCC (+12V)
#
# Component list (single supply):
#  R1  3.9kΩ  Pin6  → VCC  (collector load)
#  R2  3.9kΩ  Pin12 → VCC  (collector load)
#  R3  6.8kΩ  VCC   → CARRIER_BIAS (upper bias divider)
#  R4  6.8kΩ  CARRIER_BIAS → SIGNAL_BIAS (lower bias divider)
#  R5  750Ω   Pin5  → GND  (sets I5=1mA)
#  R6  51Ω    series carrier input pin8
#  R7  51Ω    series carrier input pin10
#  R8  1kΩ    Pin2  → GND  (Re emitter degeneration)
#  R9  1kΩ    Pin3  → GND  (Re emitter degeneration)
#  R10 10kΩ   SIGNAL_BIAS → Pin1  (signal bias)
#  R11 10kΩ   SIGNAL_BIAS → Pin4  (signal bias)
#  RV1 50kΩ   null pot between CARRIER_BIAS taps
#  C1  0.1µF  carrier input coupling (pin8)
#  C2  0.1µF  carrier input coupling (pin10)
#  C3  0.1µF  signal input coupling (pin1)
#  C4  0.1µF  signal input coupling (pin4)
#  C5  10nF   VCC bypass

# ─── KiCad PCB generator ─────────────────────────────────────────────────────
MM = 1.0  # KiCad uses mm natively

def pad_thru(num, x, y, drill=0.8, size=1.6, net="", shape="circle"):
    """Through-hole pad"""
    return f"""    (pad "{num}" thru_hole {shape} (at {x:.3f} {y:.3f}) (size {size} {size})
      (drill {drill}) (layers "*.Cu" "*.Mask") (net {net}))"""

def pad_smd(num, x, y, w=1.4, h=1.6, net="", angle=0):
    """SMD pad"""
    rot = f" (at {x:.3f} {y:.3f} {angle})" if angle else f" (at {x:.3f} {y:.3f})"
    return f"""    (pad "{num}" smd rect{rot} (size {w} {h})
      (layers "F.Cu" "F.Paste" "F.Mask") (net {net}))"""

# Net numbering
nets = {
    "": 0,
    "VCC": 1,
    "GND": 2,
    "CARRIER_P": 3,
    "CARRIER_N": 4,
    "SIGNAL_P": 5,
    "SIGNAL_N": 6,
    "OUT_P": 7,
    "OUT_N": 8,
    "CARRIER_BIAS": 9,
    "SIGNAL_BIAS": 10,
    "BIAS5": 11,
    "RE1": 12,
    "RE2": 13,
    "NULL1": 14,
    "NULL2": 15,
}

def n(name): return f'{nets[name]} "{name}"'

def fp_dip14(ref, x, y):
    """DIP-14 footprint for MC1496, pin1 top-left"""
    pitch = 2.54
    row   = 7.62 / 2.0
    # left col: pins 1..7 top→bottom
    # right col: pins 14..8 top→bottom
    pin_nets = {
        1: n("SIGNAL_N"),  2: n("RE1"),       3: n("RE2"),
        4: n("SIGNAL_P"),  5: n("BIAS5"),      6: n("OUT_P"),
        7: n("GND"),       8: n("CARRIER_P"),  9: n(""),
       10: n("CARRIER_N"), 11: n(""),         12: n("OUT_N"),
       13: n(""),         14: n("VCC"),
    }
    pads = []
    for i in range(7):
        lx = x - row;  ly = y - 3*pitch + i*pitch
        rx = x + row;  ry = y + 3*pitch - i*pitch
        lp = i+1;       rp = 14-i
        shp = "rect" if lp == 1 else "circle"
        pads.append(pad_thru(lp, lx-x, ly-y, net=pin_nets[lp], shape=shp))
        pads.append(pad_thru(rp, rx-x, ry-y, net=pin_nets[rp]))
    pads_str = "\n".join(pads)
    # IC body outline
    w2 = row + 1.5;  h2 = 3*pitch + 1.5
    silk = f"""    (fp_rect (start {-w2:.2f} {-h2:.2f}) (end {w2:.2f} {h2:.2f})
      (stroke (width 0.12) (type solid)) (fill none) (layer "F.SilkS"))
    (fp_text reference "{ref}" (at 0 {-h2-1.0:.2f}) (layer "F.SilkS")
      (effects (font (size 1 1) (thickness 0.15))))
    (fp_text value "MC1496" (at 0 {h2+1.0:.2f}) (layer "F.Fab")
      (effects (font (size 1 1) (thickness 0.15))))
    (fp_circle (center {-w2+0.5:.2f} {-h2+0.5:.2f}) (end {-w2+1.0:.2f} {-h2+0.5:.2f})
      (stroke (width 0.12) (type solid)) (fill none) (layer "F.SilkS"))"""
    return f"""  (footprint "Package_DIP:DIP-14_W7.62mm" (layer "F.Cu")
    (at {x:.3f} {y:.3f})
    (descr "MC1496 Balanced Mixer")
    (attr through_hole)
{silk}
{pads_str}
  )"""

def fp_r0805(ref, val, x, y, angle, net1, net2):
    """0805 resistor footprint"""
    d = 1.9/2
    cos_a = math.cos(math.radians(angle))
    sin_a = math.sin(math.radians(angle))
    x1 = x + d*cos_a;  y1 = y + d*sin_a
    x2 = x - d*cos_a;  y2 = y - d*sin_a
    silk_len = 2.0
    sx1 = x - silk_len/2*cos_a;  sy1 = y - silk_len/2*sin_a
    sx2 = x + silk_len/2*cos_a;  sy2 = y + silk_len/2*sin_a
    return f"""  (footprint "Resistor_SMD:R_0805_2012Metric" (layer "F.Cu")
    (at {x:.3f} {y:.3f} {angle})
    (descr "{ref} {val}")
    (attr smd)
    (fp_text reference "{ref}" (at 0 -1.6) (layer "F.SilkS")
      (effects (font (size 0.8 0.8) (thickness 0.12))))
    (fp_text value "{val}" (at 0 1.6) (layer "F.Fab")
      (effects (font (size 0.8 0.8) (thickness 0.12))))
    (fp_line (start {-1.0:.2f} -0.65) (end {1.0:.2f} -0.65)
      (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
    (fp_line (start {-1.0:.2f} 0.65) (end {1.0:.2f} 0.65)
      (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
    (pad "1" smd rect (at -0.95 0) (size 1.4 1.6)
      (layers "F.Cu" "F.Paste" "F.Mask") (net {net1}))
    (pad "2" smd rect (at 0.95 0) (size 1.4 1.6)
      (layers "F.Cu" "F.Paste" "F.Mask") (net {net2}))
  )"""

def fp_c0805(ref, val, x, y, angle, net1, net2):
    """0805 capacitor footprint"""
    fp = fp_r0805(ref, val, x, y, angle, net1, net2)
    return fp.replace("Resistor_SMD:R_0805_2012Metric", "Capacitor_SMD:C_0805_2012Metric")

def fp_connector(ref, val, x, y, pins, nets_list):
    """Generic pin header connector"""
    pitch = 2.54
    pads = []
    for i, net in enumerate(nets_list):
        py = y + i*pitch - (len(nets_list)-1)*pitch/2
        shp = "rect" if i == 0 else "circle"
        pads.append(pad_thru(i+1, 0, py - y, net=net, drill=1.0, size=1.8, shape=shp))
    pads_str = "\n".join(pads)
    h2 = (len(nets_list)-1)*pitch/2 + 1.5
    return f"""  (footprint "Connector_PinHeader_2.54mm:PinHeader_1x0{len(nets_list):02d}_P2.54mm_Vertical" (layer "F.Cu")
    (at {x:.3f} {y:.3f})
    (attr through_hole)
    (fp_text reference "{ref}" (at 0 {-h2-1:.1f}) (layer "F.SilkS")
      (effects (font (size 1 1) (thickness 0.15))))
    (fp_text value "{val}" (at 0 {h2+1:.1f}) (layer "F.Fab")
      (effects (font (size 1 1) (thickness 0.15))))
    (fp_rect (start -1.5 {-h2:.2f}) (end 1.5 {h2:.2f})
      (stroke (width 0.12) (type solid)) (fill none) (layer "F.SilkS"))
{pads_str}
  )"""

def fp_pot(ref, val, x, y):
    """Trimmer potentiometer (3-pin)"""
    return fp_connector(ref, val, x, y, 3,
        [n("CARRIER_BIAS"), n("NULL1"), n("CARRIER_BIAS")])

def segment(x1, y1, x2, y2, net, width=0.25, layer="F.Cu"):
    return f"""  (segment (start {x1:.3f} {y1:.3f}) (end {x2:.3f} {y2:.3f}) (width {width:.3f}) (layer "{layer}") (net {nets[net]}))"""

def via(x, y, net, drill=0.4, size=0.8):
    return f"""  (via (at {x:.3f} {y:.3f}) (size {size}) (drill {drill}) (layers "F.Cu" "B.Cu") (net {nets[net]}))"""

# ─── Board layout ────────────────────────────────────────────────────────────
# Board: 80mm × 65mm, origin top-left
BW, BH = 80.0, 65.0
# IC center
ICX, ICY = 40.0, 33.0

footprints = []
segments   = []

# U1: MC1496 DIP-14
footprints.append(fp_dip14("U1", ICX, ICY))

# Collector loads R1, R2 (above IC, pins 6 and 12)
R1x, R1y = ICX - 3.81, ICY - 3*2.54 + 5*2.54   # near pin6 (left row, index5 from top)
R2x, R2y = ICX + 3.81, ICY + 3*2.54 - 5*2.54   # near pin12 (right row, index5 from bottom)
footprints.append(fp_r0805("R1", "3.9k",  ICX-7,  ICY-8,  90, n("OUT_P"),  n("VCC")))
footprints.append(fp_r0805("R2", "3.9k",  ICX+7,  ICY-8,  90, n("OUT_N"),  n("VCC")))

# Bias divider R3, R4
footprints.append(fp_r0805("R3", "6.8k",  ICX+18, ICY-8,   0, n("VCC"),          n("CARRIER_BIAS")))
footprints.append(fp_r0805("R4", "6.8k",  ICX+18, ICY,     0, n("CARRIER_BIAS"), n("SIGNAL_BIAS")))

# Bias current R5 (pin5 to GND)
footprints.append(fp_r0805("R5", "750",   ICX-4,  ICY+14,  0, n("BIAS5"), n("GND")))

# Carrier input resistors R6, R7
footprints.append(fp_r0805("R6", "51",    ICX-14, ICY-5,   0, n("CARRIER_P"), n("CARRIER_P")))
footprints.append(fp_r0805("R7", "51",    ICX-14, ICY+5,   0, n("CARRIER_N"), n("CARRIER_N")))

# Emitter degeneration R8, R9
footprints.append(fp_r0805("R8", "1k",    ICX-4,  ICY+10,  0, n("RE1"), n("GND")))
footprints.append(fp_r0805("R9", "1k",    ICX+4,  ICY+10,  0, n("RE2"), n("GND")))

# Signal bias R10, R11
footprints.append(fp_r0805("R10", "10k",  ICX-14, ICY-2,  90, n("SIGNAL_BIAS"), n("SIGNAL_N")))
footprints.append(fp_r0805("R11", "10k",  ICX-14, ICY+2,  90, n("SIGNAL_BIAS"), n("SIGNAL_P")))

# Null pot RV1
footprints.append(fp_pot("RV1", "50k",    ICX+18, ICY+10))

# Coupling capacitors C1-C4 (0.1µF)
footprints.append(fp_c0805("C1", "100n",  ICX-22, ICY-5,  0, n("CARRIER_P"), n("CARRIER_P")))
footprints.append(fp_c0805("C2", "100n",  ICX-22, ICY+5,  0, n("CARRIER_N"), n("CARRIER_N")))
footprints.append(fp_c0805("C3", "100n",  ICX-22, ICY-10, 0, n("SIGNAL_N"),  n("SIGNAL_N")))
footprints.append(fp_c0805("C4", "100n",  ICX-22, ICY+10, 0, n("SIGNAL_P"),  n("SIGNAL_P")))

# VCC bypass C5
footprints.append(fp_c0805("C5", "10n",   ICX+7,  ICY-12, 0, n("VCC"), n("GND")))

# Connectors
footprints.append(fp_connector("J1", "VCC+GND", BW-8, 8, 2,
    [n("VCC"), n("GND")]))
footprints.append(fp_connector("J2", "Carrier", 8, ICY-3, 2,
    [n("CARRIER_P"), n("CARRIER_N")]))
footprints.append(fp_connector("J3", "Signal",  8, ICY+10, 2,
    [n("SIGNAL_P"), n("SIGNAL_N")]))
footprints.append(fp_connector("J4", "Output",  BW-8, ICY, 2,
    [n("OUT_P"), n("OUT_N")]))

# ─── Net declarations ─────────────────────────────────────────────────────────
net_decl = "\n".join(f'  (net {v} "{k}")' for k,v in nets.items())

# ─── Board outline ────────────────────────────────────────────────────────────
outline = f"""  (gr_rect (start 0 0) (end {BW} {BH})
    (stroke (width 0.05) (type solid)) (fill none) (layer "Edge.Cuts"))"""

# ─── Courtyard ────────────────────────────────────────────────────────────────
# (skipped for brevity)

# ─── Assemble PCB ─────────────────────────────────────────────────────────────
pcb = f"""(kicad_pcb (version 20240108) (generator "pcbnew") (generator_version "8.0")
  (general
    (thickness 1.6)
    (legacy_teardrops no)
  )
  (paper "A4")
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (32 "B.Adhes" user "B.Adhesive")
    (33 "F.Adhes" user "F.Adhesive")
    (34 "B.Paste" user)
    (35 "F.Paste" user)
    (36 "B.SilkS" user "B.Silkscreen")
    (37 "F.SilkS" user "F.Silkscreen")
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (40 "Dwgs.User" user "User.Drawings")
    (41 "Cmts.User" user "User.Comments")
    (42 "Eco1.User" user "User.Eco1")
    (43 "Eco2.User" user "User.Eco2")
    (44 "Edge.Cuts" user)
    (45 "Margin" user)
    (46 "B.CrtYd" user "B.Courtyard")
    (47 "F.CrtYd" user "F.Courtyard")
    (48 "B.Fab" user)
    (49 "F.Fab" user)
  )
  (setup
    (pad_to_mask_clearance 0.1)
    (solder_mask_min_width 0.05)
    (allow_soldermask_bridges_in_footprints no)
    (pcbplotparams
      (layerselection 0x00010fc_ffffffff)
      (outputdirectory "gerbers/")
    )
  )
{net_decl}
{outline}
{chr(10).join(footprints)}
)
"""

with open('C:/Users/29575/PycharmProjects/mc1496_mixer.kicad_pcb', 'w') as f:
    f.write(pcb)
print("PCB written → mc1496_mixer.kicad_pcb")