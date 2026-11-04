import bpy, math, traceback
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/kelvinli/Desktop/Honour/Physical_Product')
OUT=ROOT/'Reading_Machine_Test/public/models/about'
LOG=Path('/Users/kelvinli/Documents/Codex/2026-09-29/i-wi/work/about/refinement/status.txt')

def main():
 try:
  LOG.write_text('Building rounded PU navigation cushion')
  scene=bpy.data.scenes.new('PU navigation button refinement');bpy.context.window.scene=scene
  scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8;scene.render.fps=60
  with bpy.data.libraries.load(str(ROOT/'Squishy mouse.blend'),link=False) as (a,b):b.objects=['Squishy_Button_Round']
  mouse=b.objects[0];material=mouse.active_material.copy();material.name='Navigation PU foam from squishy mouse'
  bs=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  for link in list(bs.inputs['Base Color'].links):material.node_tree.links.remove(link)
  bs.inputs['Base Color'].default_value=(.491,.776,.855,1);bs.inputs['Roughness'].default_value=.53
  if 'Subsurface Weight' in bs.inputs:bs.inputs['Subsurface Weight'].default_value=.065
  a,b,c=2.15,.95,.30;segments=160;rings=80;e=.55
  vertices=[(0,0,c)];faces=[]
  for j in range(1,rings):
   phi=math.pi*j/rings
   for i in range(segments):
    t=2*math.pi*i/segments;co,si=math.cos(t),math.sin(t);sp=math.sin(phi)**e
    vertices.append((a*math.copysign(abs(co)**e,co)*sp,b*math.copysign(abs(si)**e,si)*sp,c*math.cos(phi)))
  bottom=len(vertices);vertices.append((0,0,-c))
  for i in range(segments):faces.append((0,1+i,1+(i+1)%segments))
  for j in range(rings-2):
   for i in range(segments):
    n=(i+1)%segments;u=1+j*segments;faces.append((u+i,u+segments+i,u+segments+n,u+n))
  u=1+(rings-2)*segments
  for i in range(segments):faces.append((u+i,bottom,u+(i+1)%segments))
  mesh=bpy.data.meshes.new('Cloudy cushion rounded geometry');mesh.from_pydata(vertices,[],faces);mesh.update()
  body=bpy.data.objects.new('PU_Navigation_Body',mesh);scene.collection.objects.link(body);mesh.materials.append(material)
  for p in mesh.polygons:p.use_smooth=True
  def select(obj):
   for ob in scene.objects:ob.select_set(False)
   obj.select_set(True);bpy.context.view_layer.objects.active=obj
  select(body)
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
  bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
  LOG.write_text('Baking original mouse PU material to portable normal texture')
  image=bpy.data.images.new('Navigation PU baked normal',512,512);image.colorspace_settings.name='Non-Color'
  tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;material.node_tree.nodes.active=tex
  bpy.ops.object.bake(type='NORMAL',margin=8);image.pack()
  normal=material.node_tree.nodes.new('ShaderNodeNormalMap');material.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);material.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
  def press_point(p,letter=False):
   x,y,z=p;nx=x/.86;ny=y/.82;r=math.hypot(nx,ny);angle=math.atan2(ny,nx)
   front=1 if letter else max(0,min(1,(z+.03)/.20))
   dent=.23*math.exp(-((nx/.48)**2+(ny/.54)**2)*1.15)
   shoulder=.035*math.exp(-(r/.78)**4)
   envelope=math.exp(-((r-.50)/.20)**2)
   groove=(.5+.5*math.cos(9*angle+2.5*r+.35*math.sin(3*angle)))**8
   fold=.045*envelope*groove
   swell=1+.025*front*math.exp(-((r-.75)/.24)**2)
   return (x*swell,y*swell,z-front*(dent+shoulder+fold))
  def add_press(obj,letter=False):
   obj.shape_key_add(name='Basis');key=obj.shape_key_add(name='Finger_Press')
   for v in key.data:v.co=press_point(v.co,letter)
   for frame,value in [(1,0),(8,.82),(12,1),(17,1),(29,.48),(42,.08),(49,0)]:
    key.value=value;key.keyframe_insert('value',frame=frame)
   action=obj.data.shape_keys.animation_data.action;action.name='About_Press_'+obj.name
   key.value=0
  add_press(body)
  with bpy.data.libraries.load(str(ROOT/'Squishy_Alphabet.blend'),link=False) as (x,y):y.objects=['Squishy_Letter_'+char for char in 'ABOUT']
  letters=y.objects;total=0;gap=.072
  for char,obj in zip('ABOUT',letters):
   scene.collection.objects.link(obj);obj.parent=None;obj.location=(0,0,0);obj.rotation_euler=(0,0,0);obj.scale=(1,1,1);obj.name='PU_Label_'+char;select(obj)
   for mod in list(obj.modifiers):
    if mod.type=='SUBSURF':mod.levels=1
    bpy.ops.object.modifier_apply(modifier=mod.name)
   if obj.data.shape_keys:obj.shape_key_clear()
   coords=[v.co.copy() for v in obj.data.vertices];lo=Vector(tuple(min(p[k] for p in coords) for k in range(3)));hi=Vector(tuple(max(p[k] for p in coords) for k in range(3)));size=hi-lo
   scale=.6/size.y
   for v in obj.data.vertices:v.co=(v.co-lo)*scale
   width=size.x*scale;obj['glyph_width']=width;total+=width
  total+=4*gap;fit=3.0/total;cursor=-1.5
  for obj in letters:
   width=obj['glyph_width']*fit
   for v in obj.data.vertices:
    x=cursor+v.co.x*fit;y=v.co.y-.3
    surface=c*math.sqrt(max(.001,1-(abs(x)/a)**(2/e)-(abs(y)/b)**(2/e)))
    v.co=(x,y,v.co.z+surface+.008)
   cursor+=width+gap*fit
   mat=material.copy();mat.name='Pink inflated PU letter';p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.930,.584,.730,1)
   obj.data.materials.clear();obj.data.materials.append(mat)
   for face in obj.data.polygons:face.use_smooth=True
   add_press(obj,True)
  # Grouped editable geometry and clips; independent objects keep each label recolourable.
  scene.frame_start=1;scene.frame_end=49;scene.frame_set(1)
  for ob in scene.objects:ob.select_set(True)
  LOG.write_text('Exporting animated PU button with normal and position morphs')
  bpy.ops.export_scene.gltf(filepath=str(OUT/'pu-navigation-v2.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=True,export_morph=True,export_morph_normal=True)
  # Save only this scene and its referenced assets; this does not replace the user's open file.
  bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'PU_Navigation_Button_v2.blend'),copy=True)
  LOG.write_text('complete')
 except Exception:LOG.write_text(traceback.format_exc())
 return None
bpy.app.timers.register(main,first_interval=.2)
