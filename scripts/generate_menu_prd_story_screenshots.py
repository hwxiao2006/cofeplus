#!/usr/bin/env python3
from __future__ import annotations

from html import escape
from pathlib import Path


WIDTH = 1600
HEIGHT = 1000
OUT_DIR = Path(__file__).resolve().parents[1] / "screenshots" / "menu-tag-imprint-prd"
FONT = "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif"


def rect(x, y, w, h, *, rx=18, fill="#ffffff", stroke="none", stroke_width=1, opacity=None, extra=""):
    attrs = [
        f'x="{x}"',
        f'y="{y}"',
        f'width="{w}"',
        f'height="{h}"',
        f'rx="{rx}"',
        f'fill="{fill}"',
        f'stroke="{stroke}"',
        f'stroke-width="{stroke_width}"',
    ]
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    if extra:
        attrs.append(extra)
    return f"<rect {' '.join(attrs)} />"


def line(x1, y1, x2, y2, *, stroke="#d7e2ee", stroke_width=1, opacity=None):
    attrs = [
        f'x1="{x1}"',
        f'y1="{y1}"',
        f'x2="{x2}"',
        f'y2="{y2}"',
        f'stroke="{stroke}"',
        f'stroke-width="{stroke_width}"',
        'stroke-linecap="round"',
    ]
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    return f"<line {' '.join(attrs)} />"


def text(x, y, value, *, size=16, weight=500, fill="#162033", anchor="start", opacity=None, extra=""):
    attrs = [
        f'x="{x}"',
        f'y="{y}"',
        f'font-size="{size}"',
        f'font-weight="{weight}"',
        f'fill="{fill}"',
        f'font-family="{FONT}"',
        f'text-anchor="{anchor}"',
    ]
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    if extra:
        attrs.append(extra)
    return f"<text {' '.join(attrs)}>{escape(str(value))}</text>"


def centered_button(x, y, w, h, label, *, fill, stroke="none", text_fill="#ffffff", size=16, weight=700, disabled=False):
    opacity = "0.55" if disabled else "1"
    return "\n".join([
        rect(x, y, w, h, rx=14, fill=fill, stroke=stroke, stroke_width=1, opacity=opacity),
        text(x + w / 2, y + h / 2 + 6, label, size=size, weight=weight, fill=text_fill, anchor="middle", opacity=opacity),
    ])


def pill(x, y, w, h, label, *, fill="#eef7f6", stroke="#cce7e3", text_fill="#0f766e", size=14):
    return "\n".join([
        rect(x, y, w, h, rx=h / 2, fill=fill, stroke=stroke, stroke_width=1),
        text(x + w / 2, y + h / 2 + 5, label, size=size, weight=700, fill=text_fill, anchor="middle"),
    ])


def input_box(x, y, w, label, value="", *, required=False):
    star = " *" if required else ""
    pieces = [
        text(x, y, f"{label}{star}", size=14, weight=600, fill="#344054"),
        rect(x, y + 14, w, 46, rx=12, fill="#ffffff", stroke="#d7e2ee", stroke_width=1),
    ]
    if value:
        pieces.append(text(x + 16, y + 43, value, size=15, weight=500, fill="#162033"))
    else:
        pieces.append(text(x + 16, y + 43, "请输入内容", size=15, weight=500, fill="#98a2b3"))
    return "\n".join(pieces)


def stats_chip(x, y, w, h, label, value):
    return "\n".join([
        rect(x, y, w, h, rx=16, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(x + 18, y + 24, label, size=13, weight=600, fill="#667085"),
        text(x + 18, y + 54, value, size=26, weight=800, fill="#162033"),
    ])


def field_label_value(x, y, label, value):
    return "\n".join([
        text(x, y, label, size=13, weight=600, fill="#667085"),
        text(x, y + 26, value, size=16, weight=600, fill="#162033"),
    ])


def latte_thumb(x, y, w, h, variant):
    bg = {
        "swan": "url(#thumb-warm)",
        "tulip": "url(#thumb-gold)",
        "heart": "url(#thumb-pink)",
        "panda": "url(#thumb-cool)",
    }[variant]
    parts = [
        rect(x, y, w, h, rx=22, fill=bg, stroke="#eadfcb", stroke_width=1),
        rect(x + 14, y + 14, w - 28, h - 28, rx=20, fill="#f7efe4", stroke="#ecd9bf", stroke_width=1),
        '<ellipse cx="{0}" cy="{1}" rx="{2}" ry="{3}" fill="#efe2cf" />'.format(x + w / 2, y + h / 2 + 8, w * 0.31, h * 0.28),
    ]
    cx = x + w / 2
    cy = y + h / 2 + 8
    if variant == "swan":
        parts.extend([
            '<path d="M {0} {1} C {2} {3}, {4} {5}, {6} {7}" fill="none" stroke="#8b5e3c" stroke-width="5" stroke-linecap="round"/>'.format(
                cx - 28, cy + 14, cx - 4, cy - 2, cx + 6, cy - 28, cx - 6, cy - 38
            ),
            '<path d="M {0} {1} C {2} {3}, {4} {5}, {6} {7}" fill="none" stroke="#fffaf4" stroke-width="16" stroke-linecap="round"/>'.format(
                cx - 10, cy - 8, cx + 20, cy - 10, cx + 24, cy + 16, cx + 2, cy + 22
            ),
            '<circle cx="{0}" cy="{1}" r="5" fill="#fffaf4" />'.format(cx + 18, cy - 28),
        ])
    elif variant == "tulip":
        for dx, dy, rx, ry in [(-20, 8, 20, 28), (0, -2, 22, 30), (20, 8, 20, 28)]:
            parts.append('<ellipse cx="{0}" cy="{1}" rx="{2}" ry="{3}" fill="#fffaf4" />'.format(cx + dx, cy + dy, rx, ry))
        parts.append('<path d="M {0} {1} L {2} {3}" stroke="#8b5e3c" stroke-width="5" stroke-linecap="round" />'.format(cx, cy + 42, cx, cy - 36))
    elif variant == "heart":
        parts.append(
            '<path d="M {0} {1} C {2} {3}, {4} {3}, {5} {1} C {6} {7}, {8} {9}, {10} {11} C {12} {9}, {13} {7}, {14} {1} C {15} {3}, {16} {3}, {17} {1} Z" fill="#fffaf4" />'.format(
                cx,
                cy + 34,
                cx - 34,
                cy + 10,
                cx - 34,
                cy - 22,
                cx - 34,
                cy - 44,
                cx - 8,
                cy - 46,
                cx,
                cy - 20,
                cx + 8,
                cy - 46,
                cx + 34,
                cy - 44,
                cx + 34,
                cy - 22,
                cx + 34,
                cy + 10,
                cx,
            )
        )
    elif variant == "panda":
        parts.extend([
            '<circle cx="{0}" cy="{1}" r="42" fill="#fffaf4" />'.format(cx, cy),
            '<circle cx="{0}" cy="{1}" r="16" fill="#2f2f33" />'.format(cx - 26, cy - 26),
            '<circle cx="{0}" cy="{1}" r="16" fill="#2f2f33" />'.format(cx + 26, cy - 26),
            '<ellipse cx="{0}" cy="{1}" rx="14" ry="18" fill="#2f2f33" />'.format(cx - 18, cy + 2),
            '<ellipse cx="{0}" cy="{1}" rx="14" ry="18" fill="#2f2f33" />'.format(cx + 18, cy + 2),
            '<circle cx="{0}" cy="{1}" r="8" fill="#2f2f33" />'.format(cx, cy + 20),
        ])
    return "\n".join(parts)


def tag_row(y, title_value, tag_id, buttons, *, disabled_buttons=None):
    disabled_buttons = disabled_buttons or set()
    button_parts = []
    bx = 1260
    for label, kind in buttons:
        if kind == "danger":
            fill = "#fee4e2"
            text_fill = "#b42318"
            stroke = "#fecaca"
        elif kind == "primary":
            fill = "#109c93"
            text_fill = "#ffffff"
            stroke = "none"
        else:
            fill = "#ffffff"
            text_fill = "#344054"
            stroke = "#d7e2ee"
        button_parts.append(centered_button(
            bx, y + 22, 82, 34, label, fill=fill, stroke=stroke, text_fill=text_fill, size=14, weight=700, disabled=label in disabled_buttons
        ))
        bx += 92
    return "\n".join([
        rect(1070, y, 360, 78, rx=18, fill="#ffffff", stroke="#e3edf5", stroke_width=1),
        text(1094, y + 30, title_value, size=17, weight=700, fill="#162033"),
        text(1094, y + 56, tag_id, size=13, weight=600, fill="#98a2b3"),
        *button_parts,
    ])


def business_tags_card(stats):
    return "\n".join([
        rect(520, 312, 430, 192, rx=24, fill="url(#card-glow)", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#softShadow)"'),
        text(548, 356, "业务标签管理", size=26, weight=800),
        text(548, 388, "统一维护商品标签的多语言名称与显示状态", size=15, weight=500, fill="#667085"),
        centered_button(784, 336, 136, 42, "管理标签", fill="#109c93", text_fill="#ffffff"),
        stats_chip(548, 420, 170, 66, "启用中", str(stats[0])),
        stats_chip(734, 420, 170, 66, "已隐藏", str(stats[1])),
    ])


def order_contact_card():
    return "\n".join([
        rect(110, 312, 380, 192, rx=24, fill="#ffffff", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#softShadow)"'),
        text(138, 356, "点单屏联系信息", size=24, weight=800),
        text(138, 388, "当前设备生效，切换设备后显示该设备自己的联系方式", size=15, weight=500, fill="#667085"),
        pill(344, 336, 118, 32, "当前设备生效", fill="#eef7f6", stroke="#cde8e4"),
        field_label_value(138, 430, "客服电话", "400-820-2026"),
        field_label_value(300, 430, "客服邮箱", "support@cofe.ai"),
        text(138, 482, "当前设备 RCK386 已配置联系信息", size=14, weight=600, fill="#109c93"),
    ])


def currency_card():
    return "\n".join([
        rect(110, 530, 280, 140, rx=24, fill="#ffffff", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#softShadow)"'),
        text(138, 570, "售价币种", size=22, weight=800),
        text(138, 598, "全局生效，统一菜单商品显示币种", size=15, weight=500, fill="#667085"),
        rect(138, 618, 224, 38, rx=12, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(154, 643, "CNY (¥)", size=15, weight=600, fill="#162033"),
        text(344, 643, "▼", size=13, weight=700, fill="#667085", anchor="middle"),
    ])


def settings_footer():
    return "\n".join([
        rect(110, 714, 840, 122, rx=24, fill="#ffffff", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#softShadow)"'),
        text(138, 760, "基础设置变更将随“保存基础设置”统一生效", size=15, weight=600, fill="#667085"),
        centered_button(616, 748, 148, 44, "预览点单屏", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054"),
        centered_button(778, 748, 142, 44, "保存基础设置", fill="#109c93", text_fill="#ffffff"),
    ])


def drawer_shell(body):
    return "\n".join([
        rect(90, 190, 1420, 760, rx=32, fill="#0f172b", opacity="0.16"),
        rect(1040, 210, 420, 720, rx=28, fill="#ffffff", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#shadow)"'),
        text(1070, 262, "业务标签管理", size=28, weight=800),
        text(1070, 294, "标签改动会在点击“保存基础设置”后统一生效。", size=14, weight=500, fill="#667085"),
        centered_button(1396, 236, 36, 36, "×", fill="#f2f4f7", stroke="none", text_fill="#344054", size=20, weight=700),
        body,
    ])


def business_tags_drawer_overview():
    content = [
        rect(1070, 328, 360, 166, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(1094, 362, "启用标签", size=18, weight=800),
        centered_button(1320, 340, 110, 36, "新建标签", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054", size=14),
        tag_row(386, "招牌", "tag_signature", [("编辑", "default"), ("隐藏", "default")]),
        tag_row(470, "新品", "tag_new", [("编辑", "default"), ("隐藏", "default")]),
        rect(1070, 572, 360, 148, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(1094, 606, "已隐藏标签", size=18, weight=800),
        tag_row(632, "早餐搭配", "tag_breakfast", [("恢复", "primary")]),
    ]
    return drawer_shell("\n".join(content))


def business_tags_drawer_form():
    content = [
        rect(1070, 320, 360, 246, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(1094, 356, "新建标签", size=20, weight=800),
        centered_button(1338, 334, 92, 36, "取消", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054", size=14),
        input_box(1094, 392, 152, "简体中文", "节日限定", required=True),
        input_box(1262, 392, 152, "English", "Seasonal"),
        input_box(1094, 474, 152, "日本語", "季節限定"),
        input_box(1262, 474, 152, "繁體中文", "節日限定"),
        text(1094, 542, "当前设备主语言必填，其余已启用语言选填。", size=13, weight=600, fill="#667085"),
        centered_button(1268, 526, 146, 40, "保存草稿", fill="#109c93", text_fill="#ffffff", size=15),
        rect(1070, 590, 360, 180, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(1094, 624, "启用标签", size=18, weight=800),
        centered_button(1320, 602, 110, 36, "新建标签", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054", size=14),
        tag_row(648, "招牌", "tag_signature", [("编辑", "default"), ("隐藏", "default")]),
        tag_row(732, "新品", "tag_new", [("编辑", "default"), ("隐藏", "default")]),
    ]
    return drawer_shell("\n".join(content))


def business_tags_drawer_status():
    content = [
        rect(1070, 320, 360, 248, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(1094, 356, "启用标签", size=18, weight=800),
        centered_button(1320, 334, 110, 36, "新建标签", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054", size=14),
        tag_row(386, "招牌", "tag_signature", [("编辑", "default"), ("隐藏", "default")]),
        tag_row(470, "新品", "tag_new", [("编辑", "default"), ("隐藏", "default")]),
        tag_row(554, "节日限定", "tag_seasonal", [("编辑", "default"), ("隐藏", "default")]),
        rect(1070, 604, 360, 166, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(1094, 640, "已隐藏标签", size=18, weight=800),
        tag_row(666, "早餐搭配", "tag_breakfast", [("恢复", "primary")]),
        text(1094, 740, "已绑定该标签的商品恢复后无需重新配置。", size=13, weight=600, fill="#667085"),
    ]
    return drawer_shell("\n".join(content))


def business_tags_drawer_invalid():
    content = [
        rect(1070, 324, 360, 78, rx=18, fill="#fff4ed", stroke="#fed7aa", stroke_width=1),
        text(1094, 356, "当前设备暂无可用语言，请先在“设备语言”中启用至少一种语言后再编辑标签。", size=13, weight=700, fill="#b54708"),
        rect(1070, 430, 360, 220, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(1094, 466, "启用标签", size=18, weight=800),
        centered_button(1320, 444, 110, 36, "新建标签", fill="#f2f4f7", stroke="#d7e2ee", text_fill="#98a2b3", size=14, disabled=True),
        tag_row(496, "招牌", "tag_signature", [("编辑", "default"), ("隐藏", "default")], disabled_buttons={"编辑"}),
        tag_row(580, "新品", "tag_new", [("编辑", "default"), ("隐藏", "default")], disabled_buttons={"编辑"}),
        rect(1070, 678, 360, 136, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(1094, 714, "已隐藏标签", size=18, weight=800),
        tag_row(736, "早餐搭配", "tag_breakfast", [("恢复", "primary")]),
    ]
    return drawer_shell("\n".join(content))


def device_chip():
    return pill(1222, 90, 250, 36, "当前设备：上海市中心店 · RCK386", fill="#e6f4f1", stroke="#bce3dd")


def window_header(active_tab):
    tab_specs = [
        ("菜单管理", 356, 148),
        ("印花图片设置", 518, 170),
        ("基本设置", 704, 136),
        ("批量改价", 854, 136),
    ]
    parts = [
        rect(70, 48, 1460, 904, rx=32, fill="#ffffff", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#shadow)"'),
        rect(70, 48, 1460, 120, rx=32, fill="url(#window-head)"),
        text(118, 102, "商品管理", size=34, weight=800, fill="#ffffff"),
        text(118, 136, "菜单、印花图片和基础设置统一在这里维护", size=16, weight=500, fill="#d8f3ef"),
        device_chip(),
        rect(98, 154, 1404, 70, rx=22, fill="#f8fbfd", stroke="#e3edf5", stroke_width=1),
    ]
    for label, x, w in tab_specs:
        is_active = label == active_tab
        parts.append(rect(x, 168, w, 42, rx=14, fill="#109c93" if is_active else "#ffffff", stroke="#109c93" if is_active else "#d7e2ee", stroke_width=1))
        parts.append(text(x + w / 2, 195, label, size=15, weight=700, fill="#ffffff" if is_active else "#475467", anchor="middle"))
    return "\n".join(parts)


def settings_screen(drawer_body, stats=(3, 1)):
    parts = [
        window_header("基本设置"),
        text(110, 272, "基础设置", size=30, weight=800),
        text(110, 300, "管理当前设备的联系信息、业务标签和全局币种。", size=16, weight=500, fill="#667085"),
        order_contact_card(),
        business_tags_card(stats),
        currency_card(),
        settings_footer(),
        drawer_body,
    ]
    return svg_document("业务标签管理 PRD 截图", "\n".join(parts))


def latte_card(x, y, title_value, updated, variant, *, show_copy=True, accent=False):
    buttons = []
    if show_copy:
        buttons.append(centered_button(x + 164, y + 132, 132, 34, "复制到其他设备", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054", size=13))
    buttons.append(centered_button(x + 306, y + 132, 74, 34, "删除", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054", size=13))
    stroke = "#b7ece7" if accent else "#d7e2ee"
    fill = "url(#card-glow)" if accent else "#ffffff"
    return "\n".join([
        rect(x, y, 620, 182, rx=26, fill=fill, stroke=stroke, stroke_width=1, extra='filter="url(#softShadow)"'),
        latte_thumb(x + 20, y + 20, 126, 142, variant),
        text(x + 168, y + 58, title_value, size=22, weight=800),
        text(x + 168, y + 88, f"当前设备生效，更新于 {updated}", size=14, weight=500, fill="#667085"),
        text(x + 168, y + 114, "图片、名称和更新时间保持轻量展示。", size=14, weight=500, fill="#98a2b3"),
        *buttons,
    ])


def latte_toolbar():
    return "\n".join([
        rect(110, 304, 584, 54, rx=16, fill="#ffffff", stroke="#d7e2ee", stroke_width=1),
        text(140, 338, "⌕", size=18, weight=700, fill="#667085"),
        text(174, 338, "搜索印花名称", size=15, weight=500, fill="#98a2b3"),
        centered_button(1190, 304, 182, 54, "上传印花图片", fill="#109c93", text_fill="#ffffff", size=16),
    ])


def latte_page_base():
    return "\n".join([
        window_header("印花图片设置"),
        text(110, 268, "印花图片设置", size=30, weight=800),
        text(110, 298, "当前设备生效，上传后可直接复制到其他设备。", size=16, weight=500, fill="#667085"),
        pill(1260, 260, 212, 34, "当前设备生效 · RCK386", fill="#eef7f6", stroke="#cde8e4"),
        stats_chip(110, 362 - 90, 220, 72, "总计印花数", "4"),
        latte_toolbar(),
        latte_card(110, 390, "天鹅", "2026-03-31 18:20", "swan", accent=True),
        latte_card(760, 390, "郁金香", "2026-03-31 16:42", "tulip"),
        latte_card(110, 602, "爱心", "2026-03-30 21:10", "heart"),
        latte_card(760, 602, "熊猫", "2026-03-29 19:26", "panda"),
    ])


def upload_modal():
    return "\n".join([
        rect(90, 190, 1420, 760, rx=32, fill="#0f172b", opacity="0.24"),
        rect(378, 238, 844, 524, rx=28, fill="#ffffff", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#shadow)"'),
        text(420, 292, "上传印花图片", size=28, weight=800),
        centered_button(1154, 266, 40, 40, "×", fill="#f2f4f7", text_fill="#344054", size=20),
        input_box(428, 346, 292, "印花名称", "天鹅"),
        text(428, 456, "印花图片 *", size=14, weight=600, fill="#344054"),
        centered_button(428, 474, 132, 42, "选择图片", fill="#109c93", text_fill="#ffffff", size=15),
        text(428, 540, "当前设备生效，印花名称将作为商品联动键。", size=14, weight=600, fill="#667085"),
        rect(764, 346, 382, 224, rx=22, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(796, 382, "预览", size=16, weight=700, fill="#344054"),
        latte_thumb(836, 404, 234, 132, "swan"),
        centered_button(928, 688, 116, 44, "取消", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054"),
        centered_button(1058, 688, 116, 44, "保存", fill="#109c93", text_fill="#ffffff"),
    ])


def copy_modal():
    return "\n".join([
        rect(90, 190, 1420, 760, rx=32, fill="#0f172b", opacity="0.24"),
        rect(340, 214, 920, 600, rx=28, fill="#ffffff", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#shadow)"'),
        text(380, 270, "复制印花图片到其他设备", size=28, weight=800),
        centered_button(1194, 244, 40, 40, "×", fill="#f2f4f7", text_fill="#344054", size=20),
        rect(380, 300, 840, 72, rx=18, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        text(412, 332, "天鹅", size=20, weight=800),
        text(412, 356, "来源设备：RCK386 · 同名覆盖，不相关素材不受影响", size=14, weight=600, fill="#667085"),
        rect(380, 396, 430, 48, rx=14, fill="#ffffff", stroke="#d7e2ee", stroke_width=1),
        text(408, 427, "搜索设备或点位", size=15, weight=500, fill="#98a2b3"),
        centered_button(832, 396, 170, 48, "全选当前筛选", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054", size=14),
        centered_button(1016, 396, 170, 48, "清空已选", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054", size=14),
        text(380, 482, "已选 2 台设备", size=16, weight=700, fill="#475467"),
        rect(380, 500, 840, 72, rx=18, fill="#ecfdf3", stroke="#b7e7c3", stroke_width=1),
        text(412, 532, "预计覆盖 1 台，新增 1 台", size=18, weight=800, fill="#027a48"),
        text(412, 556, "按同名覆盖、不同名新增执行，其他无关素材保持不变。", size=14, weight=600, fill="#067647"),
        rect(380, 596, 840, 142, rx=20, fill="#f8fbfd", stroke="#d7e2ee", stroke_width=1),
        *copy_option(412, 626, "上海市中心店 · RCK385", checked=True),
        *copy_option(412, 670, "北京朝阳门店 · RCB036", checked=True),
        *copy_option(412, 714, "广州天河店 · RCK400", checked=False),
        centered_button(970, 754, 116, 44, "取消", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054"),
        centered_button(1100, 754, 120, 44, "开始复制", fill="#109c93", text_fill="#ffffff"),
    ])


def copy_option(x, y, label, *, checked=False):
    fill = "#109c93" if checked else "#ffffff"
    stroke = "#109c93" if checked else "#d7e2ee"
    check_mark = text(x + 13, y + 15, "✓" if checked else "", size=14, weight=800, fill="#ffffff", anchor="middle")
    return [
        rect(x, y, 22, 22, rx=6, fill=fill, stroke=stroke, stroke_width=1),
        check_mark,
        text(x + 36, y + 17, label, size=15, weight=600, fill="#344054"),
    ]


def delete_modal():
    return "\n".join([
        rect(90, 190, 1420, 760, rx=32, fill="#0f172b", opacity="0.24"),
        rect(520, 372, 560, 256, rx=28, fill="#ffffff", stroke="#d7e2ee", stroke_width=1, extra='filter="url(#shadow)"'),
        text(560, 432, "删除印花图片", size=28, weight=800),
        text(560, 474, "删除后，商品侧同名拉花将视为未配置素材，当前设备也不会再显示这张图片。", size=15, weight=600, fill="#475467"),
        text(560, 508, "如需修改现有素材，请删除后重新上传。", size=15, weight=600, fill="#b42318"),
        centered_button(820, 556, 108, 44, "取消", fill="#ffffff", stroke="#d7e2ee", text_fill="#344054"),
        centered_button(942, 556, 108, 44, "确认删除", fill="#d92d20", text_fill="#ffffff"),
    ])


def latte_screen(overlay):
    return svg_document("印花图片设置 PRD 截图", "\n".join([latte_page_base(), overlay]))


def svg_document(title_value, body):
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="{escape(title_value)}">
  <defs>
    <linearGradient id="canvas-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f9fcff" />
      <stop offset="52%" stop-color="#edf4fb" />
      <stop offset="100%" stop-color="#e4edf6" />
    </linearGradient>
    <linearGradient id="window-head" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#083344" />
      <stop offset="52%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#109c93" />
    </linearGradient>
    <linearGradient id="card-glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f6fffd" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
    <linearGradient id="thumb-warm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8ead9" />
      <stop offset="100%" stop-color="#e6c7a2" />
    </linearGradient>
    <linearGradient id="thumb-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f9efcf" />
      <stop offset="100%" stop-color="#f1c77a" />
    </linearGradient>
    <linearGradient id="thumb-pink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f9e5e2" />
      <stop offset="100%" stop-color="#e9b3af" />
    </linearGradient>
    <linearGradient id="thumb-cool" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dce8f6" />
      <stop offset="100%" stop-color="#a5c0dd" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.16" />
    </filter>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.08" />
    </filter>
  </defs>
  {rect(0, 0, WIDTH, HEIGHT, rx=0, fill="url(#canvas-bg)", stroke="none")}
  {body}
</svg>
"""


def build_assets():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = {
        "business-tag-uf001-overview.svg": settings_screen(business_tags_drawer_overview(), stats=(3, 1)),
        "business-tag-uf002-form.svg": settings_screen(business_tags_drawer_form(), stats=(4, 0)),
        "business-tag-uf003-status-groups.svg": settings_screen(business_tags_drawer_status(), stats=(3, 1)),
        "business-tag-uf004-no-language.svg": settings_screen(business_tags_drawer_invalid(), stats=(3, 1)),
        "imprint-uf001-overview.svg": latte_screen(""),
        "imprint-uf002-upload-modal.svg": latte_screen(upload_modal()),
        "imprint-uf003-copy-modal.svg": latte_screen(copy_modal()),
        "imprint-uf004-delete-confirm.svg": latte_screen(delete_modal()),
    }
    for name, svg in files.items():
        (OUT_DIR / name).write_text(svg, encoding="utf-8")
    print(f"generated {len(files)} files in {OUT_DIR}")


if __name__ == "__main__":
    build_assets()
