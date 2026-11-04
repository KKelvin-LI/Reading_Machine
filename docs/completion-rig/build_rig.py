import bpy,math
from pathlib import Path
base=Path('/Users/kelvinli/Documents/Codex/2026-09-29/i-wi/outputs/frog-mascot')
bpy.ops.wm.open_mainfile(filepath=str(base/'Frog_Mascot_Yellow.blend'))
old=next(o for o in bpy.context.scene.objects if o.name.startswith('Continuous frog face'))
green=old.data.materials[0]
bpy.data.objects.remove(old,do_unlink=True)
parts=[]
source=(base/'build_frog.py').read_text();exec(source[source.index('def ell'):source.index('# Face looks')])
recipe=(base/'refine_body_v7.py').read_text();exec(recipe[recipe.index("face=ell("):recipe.index("bpy.ops.object.select_all(action='DESELECT')")])
def merge(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=name
 r=obj.modifiers.new('Original smooth skin','REMESH');r.mode='VOXEL';r.voxel_size=.022;bpy.ops.object.modifier_apply(modifier=r.name)
 s=obj.modifiers.new('Original smoothing','SMOOTH');s.factor=1;s.iterations=30;bpy.ops.object.modifier_apply(modifier=s.name)
 for p in obj.data.polygons:p.use_smooth=True
 return obj
merge([face]+eyes,'Eaty rigid head skin')
merge([body]+limbs,'Eaty stationary torso and legs')
bpy.ops.object.select_all(action='DESELECT')
for o in list(bpy.context.scene.objects):
 if o.type=='CURVE':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.name not in ('Cube','Studio floor'):o.select_set(True)
out=Path('/Users/kelvinli/Desktop/Honour/Physical_Product/Reading_Machine_Test/public/models/home')
bpy.ops.export_scene.gltf(filepath=str(out/'frog-completion.glb'),export_format='GLB',use_selection=True)
print('Exported rigid head and stationary body')
