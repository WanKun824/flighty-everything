"""Print a compact inventory for a Blender file in background mode."""

import bpy


print("BLENDER_VERSION", bpy.app.version_string)
print("SCENE", bpy.context.scene.name)
print("OBJECT_COUNT", len(bpy.data.objects))
for obj in bpy.data.objects:
    dimensions = tuple(round(value, 4) for value in obj.dimensions)
    materials = [slot.material.name if slot.material else "<none>" for slot in obj.material_slots]
    print("OBJECT", obj.name, obj.type, dimensions, materials)

print("MATERIAL_COUNT", len(bpy.data.materials))
for item in bpy.data.materials:
    color = tuple(round(value, 4) for value in item.diffuse_color)
    print("MATERIAL", item.name, color)

print("TEXT_BLOCKS", [item.name for item in bpy.data.texts])
for text in bpy.data.texts:
    body = text.as_string().strip().replace("\n", " ")[:400]
    if body:
        print("TEXT", text.name, body)
