"""Prepare user-supplied vehicle assets as normalized, compressed GLB files.

Run with Blender in background mode:
  blender --background --python scripts/prepare_vehicle.py -- MODE INPUT OUTPUT PREVIEW
"""

from pathlib import Path
import math
import sys

import bpy
from mathutils import Vector


mode, source_arg, output_arg, preview_arg = sys.argv[sys.argv.index("--") + 1 :]
source = Path(source_arg)
output = Path(output_arg)
preview = Path(preview_arg)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def load_source() -> None:
    if source.suffix.lower() == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(source))
    elif source.suffix.lower() in {".glb", ".gltf"}:
        reset_scene()
        bpy.ops.import_scene.gltf(filepath=str(source))
    else:
        raise ValueError(f"Unsupported source: {source}")


def keep_mesh(obj: bpy.types.Object) -> bool:
    if obj.type != "MESH":
        return False
    if mode == "ferry":
        return obj.name == "Plane"
    if mode == "flight":
        return obj.name == "Air Plane"
    if mode == "train":
        lowered = obj.name.lower()
        return lowered not in {"ground", "rail", "stationsquare"}
    return True


def prune_scene() -> list[bpy.types.Object]:
    keep = [obj for obj in bpy.context.scene.objects if keep_mesh(obj)]
    for obj in list(bpy.context.scene.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in keep:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world
    return keep


def principled(name: str, color: tuple[float, float, float, float], roughness: float, metallic: float = 0.0):
    item = bpy.data.materials.new(name)
    item.diffuse_color = color
    item.use_nodes = True
    bsdf = item.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return item


def sampled_color(obj: bpy.types.Object, polygon: bpy.types.MeshPolygon):
    uv_layer = obj.data.uv_layers.active
    if not uv_layer:
        return None
    image = None
    for slot in obj.material_slots:
        material = slot.material
        if not material or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                image = node.image
                break
    if not image:
        return None
    width, height = image.size
    pixels = image.pixels
    u = sum(uv_layer.data[index].uv.x for index in polygon.loop_indices) / len(polygon.loop_indices)
    v = sum(uv_layer.data[index].uv.y for index in polygon.loop_indices) / len(polygon.loop_indices)
    x = min(width - 1, max(0, int((u % 1.0) * width)))
    y = min(height - 1, max(0, int((v % 1.0) * height)))
    offset = (y * width + x) * 4
    return tuple(float(pixels[offset + channel]) for channel in range(3))


def style_car(objects: list[bpy.types.Object]) -> None:
    red = principled("Manyou Coral Body", (0.96, 0.11, 0.25, 1.0), 0.3, 0.12)
    white = principled("Manyou White Glass", (0.98, 0.99, 1.0, 1.0), 0.12, 0.04)
    black = principled("Manyou Black Wheels", (0.015, 0.018, 0.025, 1.0), 0.42, 0.2)
    for obj in objects:
        original_colors = [sampled_color(obj, polygon) for polygon in obj.data.polygons]
        obj.data.materials.clear()
        obj.data.materials.append(red)
        obj.data.materials.append(white)
        obj.data.materials.append(black)
        if obj.name.startswith("wheel-"):
            for polygon in obj.data.polygons:
                polygon.material_index = 2
            continue
        for polygon, color in zip(obj.data.polygons, original_colors):
            if color is None:
                polygon.material_index = 0
                continue
            r, g, b = color
            if r > 0.72 and r > g * 1.35:
                polygon.material_index = 0
            else:
                polygon.material_index = 1


def normalize(objects: list[bpy.types.Object]) -> None:
    if mode == "flight":
        for obj in objects:
            obj.rotation_euler.rotate_axis("X", math.radians(90))
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    high = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    center = (low + high) * 0.5
    extent = max(high.x - low.x, high.y - low.y, high.z - low.z)
    scale = 4.2 / extent if extent else 1.0
    for obj in objects:
        obj.location = (obj.location - center) * scale
        obj.scale *= scale
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    bottom = min(v.z for v in corners)
    for obj in objects:
        obj.location.z -= bottom
    bpy.context.view_layer.update()


def export_glb(objects: list[bpy.types.Object]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )


def point_camera(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(objects: list[bpy.types.Object]) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(preview)
    world = bpy.data.worlds.new("Manyou Preview World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.005, 0.012, 0.03, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.22
    scene.world = world

    camera_data = bpy.data.cameras.new("Preview Camera")
    camera = bpy.data.objects.new("Preview Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (8.2, -9.2, 6.2)
    camera.data.lens = 54
    point_camera(camera, Vector((0, 0, 1.15)))
    scene.camera = camera

    for name, location, energy, size, color in [
        ("Key", (4.5, -3.5, 7.0), 1100, 5.0, (0.78, 0.9, 1.0)),
        ("Rim", (-4.5, 2.0, 5.0), 900, 4.0, (0.3, 0.55, 1.0)),
        ("Fill", (1.0, 4.0, 3.0), 700, 3.0, (1.0, 0.45, 0.28)),
    ]:
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = location
        point_camera(light, Vector((0, 0, 0.8)))

    preview.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)


load_source()
objects = prune_scene()
if not objects:
    raise RuntimeError(f"No mesh objects found for {mode}")
if mode == "car":
    style_car(objects)
normalize(objects)
export_glb(objects)
render_preview(objects)
print("PREPARED", mode, output, output.stat().st_size, preview)
