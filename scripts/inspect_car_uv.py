"""Inspect the color-atlas usage of a GLB car model."""

from collections import Counter
import sys

import bpy


source = sys.argv[sys.argv.index("--") + 1]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)

for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    uv_layer = obj.data.uv_layers.active
    image = None
    for slot in obj.material_slots:
        material = slot.material
        if not material or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                image = node.image
                break
    counts = Counter()
    if uv_layer and image:
        width, height = image.size
        pixels = list(image.pixels)
        for polygon in obj.data.polygons:
            u = sum(uv_layer.data[index].uv.x for index in polygon.loop_indices) / len(polygon.loop_indices)
            v = sum(uv_layer.data[index].uv.y for index in polygon.loop_indices) / len(polygon.loop_indices)
            x = min(width - 1, max(0, int((u % 1.0) * width)))
            y = min(height - 1, max(0, int((v % 1.0) * height)))
            offset = (y * width + x) * 4
            color = tuple(round(pixels[offset + channel], 2) for channel in range(3))
            counts[color] += 1
    print("OBJECT", obj.name, "POLYGONS", len(obj.data.polygons), "COLORS", counts.most_common(16))
