# Instrucciones para Gemini — Galería + Fotos de Equipo, Barbería Savage

## Objetivo
Generar imágenes fotorrealistas para la galería del storefront público de **Barbería Savage** usando Nanobanana, y subirlas a MongoDB Atlas. Al finalizar, la galería del sitio `barberiasavage` debe mostrar trabajos reales y convincentes que transmitan profesionalismo y calidad.

Adicionalmente, se reemplazarán las fotos de perfil de los 3 barberos — actualmente fotos de Unsplash que parecen empleados de startup tecnológica — por retratos auténticos de barberos latinoamericanos con personalidad y estilo propio.

---

## Contexto técnico (LEE ESTO ANTES DE ACTUAR)

### Base de datos
- **URI:** `mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0`
- **DB:** `test`
- **Colección destino:** `beautygalleryitems`

### IDs críticos (NO confundas estos)
```
tenantId  : 69c71e7840187515237b821f   ← Barbería Savage
createdBy : 69c71e7b40187515237b825f   ← Admin savageorganicsolutions+test100@gmail.com
```

### Profesionales del salón (para asignar fotos)
```
Carlos "El Pulpo" Ramírez : 69cb464e6eaab4b458348203
Miguel Ángel Torres        : 69cb464e6eaab4b458348204
José Luis Mendoza          : 69cb464e6eaab4b458348205
```

### Items EXISTENTES a eliminar (son placeholders genéricos sin valor)
```
69cb464e6eaab4b45834820e  ← Cortes, imagen Unsplash genérica
69cb464e6eaab4b45834820f  ← Barba, imagen Unsplash genérica
69cb464e6eaab4b458348210  ← Cortes, imagen Unsplash genérica
```

### Estética del sitio
- **Colores:** Dorado `#c9aa13` + Azul marino `#1a4c8e`
- **Vibe:** Barbería premium venezolana/latinoamericana, masculino, sofisticado
- **Clientela tipo:** Hombres latinos, 20-45 años

---

## Estructura de cada documento en MongoDB

```json
{
  "tenantId"    : { "$oid": "69c71e7840187515237b821f" },
  "image"       : "<URL o data:image/jpeg;base64,...>",
  "beforeImage" : "<URL o base64, solo si es Antes/Después>",
  "caption"     : "Texto descriptivo del trabajo",
  "category"    : "Cortes | Barba | Color | Combos | Tratamientos",
  "tags"        : ["tag1", "tag2"],
  "isActive"    : true,
  "sortOrder"   : 0,
  "createdBy"   : { "$oid": "69c71e7b40187515237b825f" },
  "professionalId": { "$oid": "<id del profesional>" }
}
```

> **Nota sobre `image`:** El campo acepta tanto una URL directa (`https://...`) como una cadena base64 (`data:image/jpeg;base64,...`). Usa lo que Nanobanana te entregue. Si entrega una URL, úsala directamente. Si entrega bytes/base64, conviértela y úsala.

---

## PASO 1 — Verificación de seguridad (OBLIGATORIO antes de cualquier escritura)

Ejecuta este script y confirma que los datos coinciden antes de continuar:

```javascript
const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
async function verify() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const tenantId = new ObjectId('69c71e7840187515237b821f');

  const tenant = await db.collection('tenants').findOne({ _id: tenantId });
  console.log('✅ Tenant:', tenant?.name, '| ID:', tenant?._id?.toString());
  console.log('   Esperado: "Barbería Savage" | ID: 69c71e7840187515237b821f');
  console.log('   ¿Coincide?', tenant?.name === 'Barbería Savage');

  const currentGallery = await db.collection('beautygalleryitems').countDocuments({ tenantId });
  console.log('📸 Items en galería actualmente:', currentGallery, '(esperado: 3)');

  await client.close();
}
verify().catch(console.error);
```

**Si el output dice `¿Coincide?: true` y `Items en galería actualmente: 3`, continúa. Si no, DETENTE y reporta.**

---

## PASO 2 — Genera las imágenes con Nanobanana

Genera las siguientes imágenes **en orden**. Para los pares Antes/Después, las dos imágenes deben mostrar el mismo modelo con el mismo ángulo de cámara y fondo — solo cambia el cabello/barba.

---

### IMAGEN 1 — Degradado Skin Fade (solo "después")
**Categoría:** Cortes | **Profesional:** Carlos "El Pulpo" Ramírez

**Prompt Nanobanana:**
```
Photorealistic professional barbershop portrait. Latin Hispanic man, late 20s, short dark hair with a perfect skin fade — shaved clean at the sides and back, gradually blending into 2-3 inches of textured natural hair on top. The fade is flawless, high-contrast, showing excellent craftsmanship. Man is seated in a vintage leather barber chair. Background: dark mahogany barbershop interior with warm golden accent lighting, blurred bokeh. Side lighting highlights the precision of the fade. Expression: confident, relaxed. Shot: medium close-up from the front-left angle showing the fade clearly. Style: editorial grooming photography, ultra-sharp detail on the hair texture. Aspect ratio 1:1.
```

---

### IMAGEN 2A — Barba descuidada (ANTES del arreglo)
**Categoría:** Barba | Par Antes/Después #1

**Prompt Nanobanana:**
```
Photorealistic portrait of a Latin Hispanic man, mid 30s, with an overgrown, unkempt beard — 3-4 weeks of uneven growth, stray hairs, uneven neckline, no defined shape. Hair is also slightly overgrown and unstyled. Man faces camera directly, seated in a barber chair. Background: dark barbershop with golden accent lights, slightly blurred. Neutral expression. Side lighting, medium close-up. Style: professional grooming photography, natural skin tones. IMPORTANT: same face, same lighting angle, same background as its "after" pair. Aspect ratio 1:1.
```

### IMAGEN 2B — Barba perfilada (DESPUÉS del arreglo)
**Misma categoría** | Par Antes/Después #1

**Prompt Nanobanana:**
```
Photorealistic portrait of the SAME Latin Hispanic man from the "before" image, mid 30s, now with a perfectly sculpted beard — clean neckline, sharp cheek line, well-defined shape, evenly trimmed to about 1 inch, with hot towel treatment glow on skin. Hair is also neatly cut and styled. Man faces camera directly, same barber chair. Background: exact same dark barbershop with golden accent lights, slightly blurred. Confident smile. Same side lighting angle, same medium close-up framing. Style: professional grooming photography. IMPORTANT: must look like same person and same setting as the "before" image. Aspect ratio 1:1.
```

---

### IMAGEN 3A — Cabello descuidado (ANTES del fade)
**Categoría:** Cortes | Par Antes/Después #2

**Prompt Nanobanana:**
```
Photorealistic portrait of a young Latin Hispanic man, early 20s, with overgrown messy natural hair — 2-3 months of growth, no defined shape, hair covering ears and neck, uneven, slightly curly and frizzy. No beard. Man seated in a leather barber chair, facing slightly left to show the side profile clearly. Background: dark premium barbershop interior, warm golden lighting, blurred. Neutral expression. Style: professional grooming photography, editorial quality. IMPORTANT: same face, same side-angle, same lighting, same background as its "after" pair. Aspect ratio 1:1.
```

### IMAGEN 3B — Low Fade limpio (DESPUÉS del corte)
**Par Antes/Después #2**

**Prompt Nanobanana:**
```
Photorealistic portrait of the SAME young Latin Hispanic man from the "before" image, early 20s, now with a clean low skin fade — perfectly blended from bald at the bottom to 1.5 inches of neat natural hair on top with a light wave. Clean neckline. No beard. Same barber chair, facing slightly left to show the fade profile clearly. Background: exact same dark premium barbershop, warm golden lighting, blurred. Confident expression. Same framing and lighting angle. Style: editorial grooming photography. Aspect ratio 1:1.
```

---

### IMAGEN 4A — Sin tinte, cabello natural (ANTES)
**Categoría:** Color | Par Antes/Después #3

**Prompt Nanobanana:**
```
Photorealistic portrait of a Latin Hispanic man, late 20s, with all-natural dark brown/black medium-length hair (about 3 inches), slightly grown out, no visible style or treatment. Seated facing camera, 3/4 angle. Dark premium barbershop background with gold accent lights, blurred. Neutral expression. Medium close-up. Style: professional photography. IMPORTANT: same face, same angle, same background, same lighting as its "after" pair. Aspect ratio 1:1.
```

### IMAGEN 4B — Tinte con matices dorados (DESPUÉS)
**Par Antes/Después #3**

**Prompt Nanobanana:**
```
Photorealistic portrait of the SAME Latin Hispanic man from the "before" image, late 20s, now with professionally colored hair — same dark brown base but with warm golden/honey highlights and subtle caramel balayage throughout, freshly styled and blow-dried with volume. Hair is groomed and polished. Same seated 3/4 angle. Exact same dark premium barbershop background, same gold accent lighting, blurred. Satisfied smile. Style: professional grooming/color photography. Aspect ratio 1:1.
```

---

### IMAGEN 5 — Afeitado con Navaja (solo foto)
**Categoría:** Barba | **Profesional:** José Luis Mendoza

**Prompt Nanobanana:**
```
Photorealistic close-up barbershop scene. Latin Hispanic man, mid 30s, reclined in a luxury barber chair receiving a traditional straight razor shave. Hot white shaving cream covers the lower face and jaw. A skilled barber's hands (dark skin, clean nails) are visible holding a gleaming straight razor with precision. Hot towel rolled nearby on the armrest. Background: vintage premium barbershop, dark wood shelves with branded products, warm golden Edison bulb lighting. Dramatic side lighting creates luxury atmosphere. Style: editorial beauty/grooming photography, ultra-sharp detail. Aspect ratio 1:1.
```

---

### IMAGEN 6 — Corte Clásico Caballero (solo foto)
**Categoría:** Cortes | **Profesional:** Miguel Ángel Torres

**Prompt Nanobanana:**
```
Photorealistic professional barbershop portrait. Latin Hispanic man, 40s, distinguished look, silver-streaked dark hair with a classic gentleman's cut — side part, tapered sides, polished and clean. Well-groomed short beard, salt-and-pepper. Wearing a black barber cape. Seated upright in a vintage barber chair, slight smile, looking at camera. Background: premium barbershop interior — dark mahogany, antique mirrors, gold accents, blurred. Warm directional lighting from the left. Style: refined, elegant, editorial grooming portrait. Aspect ratio 1:1.
```

---

### IMAGEN 7 — Black Mask Facial (solo foto)
**Categoría:** Tratamientos

**Prompt Nanobanana:**
```
Photorealistic portrait of a Latin Hispanic man, late 20s, at a premium barbershop receiving a facial treatment — a charcoal black peel-off mask evenly applied to his face (except eyes and lips), eyes closed, expression of relaxation. He's reclined in the barber chair wearing a white salon cape. On a small tray nearby: small brush, black mask jar, warm towel. Background: dark luxury barbershop with soft warm golden lighting. Calm spa-like atmosphere. Style: wellness and grooming editorial photography. Aspect ratio 1:1.
```

---

### IMAGEN 8 — Corte Infantil (solo foto)
**Categoría:** Cortes

**Prompt Nanobanana:**
```
Photorealistic heartwarming barbershop scene. A Latin Hispanic boy, 6-8 years old, sitting proudly in a large leather barber chair with a booster seat, wearing a black barber cape that's too big for him — charming and cute. He has just received a fresh clean haircut: neat fade on the sides, short natural hair on top. Big proud smile showing some missing teeth. A barber's hands are visible in the background holding scissors. The boy's father (blurred, out of focus) watches proudly from the side. Background: warm premium barbershop, golden lighting, dark wood. Style: candid, authentic, professional photography. Aspect ratio 1:1.
```

---

### IMAGEN 9 — Corte + Barba Combo (solo foto)
**Categoría:** Combos | **Profesional:** José Luis Mendoza

**Prompt Nanobanana:**
```
Photorealistic professional barbershop after-shot. Latin Hispanic man, early 30s, just finished receiving the full treatment — fresh sharp fade on the sides, styled voluminous hair on top, and a perfectly edged short beard with crisp cheek and neck lines. Confident, handsome, well-groomed. Wearing a black barber cape, seated in a barber chair. He's admiring himself in a large vintage mirror with gold frame — we see both his face and the back/side of his head in the reflection simultaneously. Background: premium barbershop, dark tones, golden accent lighting. Style: dynamic, confident grooming editorial. Aspect ratio 1:1.
```

---

## PASO 3 — Script de inserción en MongoDB

Después de generar TODAS las imágenes, ejecuta el siguiente script Node.js. **Sustituye cada `IMAGE_URL_X` con la URL o base64 que Nanobanana te entregó para cada imagen.**

```javascript
const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

// ============================================================
// SUSTITUYE AQUÍ con las URLs/base64 de Nanobanana
// ============================================================
const IMAGES = {
  fade:           'IMAGE_URL_1',    // Imagen 1: Skin Fade
  barbaAntes:     'IMAGE_URL_2A',   // Imagen 2A: Barba antes
  barbaDespues:   'IMAGE_URL_2B',   // Imagen 2B: Barba después
  corteAntes:     'IMAGE_URL_3A',   // Imagen 3A: Cabello antes
  corteDespues:   'IMAGE_URL_3B',   // Imagen 3B: Fade después
  tinteAntes:     'IMAGE_URL_4A',   // Imagen 4A: Sin tinte
  tinteDespues:   'IMAGE_URL_4B',   // Imagen 4B: Con tinte
  navaja:         'IMAGE_URL_5',    // Imagen 5: Afeitado navaja
  clasico:        'IMAGE_URL_6',    // Imagen 6: Corte clásico
  blackMask:      'IMAGE_URL_7',    // Imagen 7: Black mask
  infantil:       'IMAGE_URL_8',    // Imagen 8: Corte infantil
  combo:          'IMAGE_URL_9',    // Imagen 9: Corte + Barba
};
// ============================================================

const TENANT_ID  = new ObjectId('69c71e7840187515237b821f');
const CREATED_BY = new ObjectId('69c71e7b40187515237b825f');

const EL_PULPO   = new ObjectId('69cb464e6eaab4b458348203');
const MIGUEL     = new ObjectId('69cb464e6eaab4b458348204');
const JOSE_LUIS  = new ObjectId('69cb464e6eaab4b458348205');

const OLD_IDS = [
  new ObjectId('69cb464e6eaab4b45834820e'),
  new ObjectId('69cb464e6eaab4b45834820f'),
  new ObjectId('69cb464e6eaab4b458348210'),
];

const newItems = [
  // ── Par Antes/Después: Barba ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.barbaDespues,
    beforeImage: IMAGES.barbaAntes,
    caption: 'Barba perfilada con diseño — de lo silvestre a lo impecable',
    category: 'Barba',
    tags: ['barba', 'perfilado', 'antes-despues', 'transformacion'],
    isActive: true,
    sortOrder: 0,
    createdBy: CREATED_BY,
    professionalId: JOSE_LUIS,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ── Par Antes/Después: Fade ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.corteDespues,
    beforeImage: IMAGES.corteAntes,
    caption: 'Low fade — de cero a cien en 45 minutos',
    category: 'Cortes',
    tags: ['fade', 'skin-fade', 'antes-despues', 'transformacion'],
    isActive: true,
    sortOrder: 1,
    createdBy: CREATED_BY,
    professionalId: EL_PULPO,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ── Par Antes/Después: Tinte ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.tinteDespues,
    beforeImage: IMAGES.tinteAntes,
    caption: 'Mechas californianas — matiz dorado con técnica balayage',
    category: 'Color',
    tags: ['tinte', 'color', 'balayage', 'antes-despues'],
    isActive: true,
    sortOrder: 2,
    createdBy: CREATED_BY,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ── Skin Fade (solo después) ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.fade,
    caption: 'Degradado skin fade — precisión milimétrica',
    category: 'Cortes',
    tags: ['fade', 'skin-fade', 'degradado', 'moderno'],
    isActive: true,
    sortOrder: 3,
    createdBy: CREATED_BY,
    professionalId: EL_PULPO,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ── Afeitado con Navaja ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.navaja,
    caption: 'Afeitado tradicional con navaja — un lujo que mereces',
    category: 'Barba',
    tags: ['navaja', 'afeitado', 'clasico', 'lujo'],
    isActive: true,
    sortOrder: 4,
    createdBy: CREATED_BY,
    professionalId: JOSE_LUIS,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ── Corte Clásico ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.clasico,
    caption: 'Corte clásico con textura — atemporal y elegante',
    category: 'Cortes',
    tags: ['clasico', 'caballero', 'elegante', 'textura'],
    isActive: true,
    sortOrder: 5,
    createdBy: CREATED_BY,
    professionalId: MIGUEL,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ── Corte + Barba Combo ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.combo,
    caption: 'Combo Corte + Barba — experiencia completa Savage',
    category: 'Combos',
    tags: ['combo', 'corte', 'barba', 'completo'],
    isActive: true,
    sortOrder: 6,
    createdBy: CREATED_BY,
    professionalId: JOSE_LUIS,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ── Black Mask Facial ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.blackMask,
    caption: 'Black Mask + Limpieza Facial — piel renovada',
    category: 'Tratamientos',
    tags: ['facial', 'black-mask', 'tratamiento', 'cuidado'],
    isActive: true,
    sortOrder: 7,
    createdBy: CREATED_BY,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ── Corte Infantil ──
  {
    tenantId: TENANT_ID,
    image: IMAGES.infantil,
    caption: 'Corte infantil — para los futuros caballeros Savage',
    category: 'Cortes',
    tags: ['infantil', 'ninos', 'familiar', 'primer-corte'],
    isActive: true,
    sortOrder: 8,
    createdBy: CREATED_BY,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');
    const db = client.db('test');
    const col = db.collection('beautygalleryitems');

    // Verificación final antes de escribir
    const tenant = await db.collection('tenants').findOne({ _id: TENANT_ID });
    if (tenant?.name !== 'Barbería Savage') {
      throw new Error(`❌ SEGURIDAD: tenant incorrecto. Esperado "Barbería Savage", encontrado "${tenant?.name}". ABORTANDO.`);
    }
    console.log('✅ Tenant verificado:', tenant.name);

    // Validar que todas las imágenes están definidas
    const missingImages = Object.entries(IMAGES).filter(([, v]) => v.startsWith('IMAGE_URL_'));
    if (missingImages.length > 0) {
      throw new Error(`❌ FALTAN IMÁGENES: ${missingImages.map(([k]) => k).join(', ')}. Sustituye todos los IMAGE_URL_X antes de ejecutar.`);
    }

    // Eliminar placeholders existentes
    console.log('🗑️  Eliminando 3 placeholders genéricos...');
    const deleteResult = await col.deleteMany({ _id: { $in: OLD_IDS } });
    console.log(`   Eliminados: ${deleteResult.deletedCount} items\n`);

    // Insertar nuevos items
    console.log('📸 Insertando galería de Barbería Savage...');
    const insertResult = await col.insertMany(newItems);
    console.log(`   ✅ Insertados: ${insertResult.insertedCount} items\n`);

    // Verificación final
    const total = await col.countDocuments({ tenantId: TENANT_ID });
    console.log(`📊 Total items en galería ahora: ${total}`);
    console.log('🎉 ¡Galería de Barbería Savage actualizada exitosamente!');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('   No se realizaron cambios parciales — verifica e intenta de nuevo.');
  } finally {
    await client.close();
  }
}

run();
```

---

## PASO 4 — Verificación post-inserción

Ejecuta este script para confirmar que todo quedó bien:

```javascript
const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
async function verify() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const tenantId = new ObjectId('69c71e7840187515237b821f');
  
  const items = await db.collection('beautygalleryitems')
    .find({ tenantId })
    .sort({ sortOrder: 1 })
    .project({ caption: 1, category: 1, hasImage: { $gt: ['$image', ''] }, hasBefore: { $gt: ['$beforeImage', null] }, sortOrder: 1 })
    .toArray();
  
  console.log(`\n📸 Galería Barbería Savage — ${items.length} items:\n`);
  items.forEach((item, i) => {
    const ba = item.hasBefore ? ' [B&A]' : '';
    console.log(`  ${i + 1}. [${item.category}]${ba} ${item.caption}`);
  });
  
  const baCount = items.filter(i => i.hasBefore).length;
  console.log(`\n✅ Resumen: ${items.length} total, ${baCount} con Antes/Después`);
  await client.close();
}
verify().catch(console.error);
```

**Resultado esperado:** 9 items, 3 con [B&A], distribuidos en Cortes, Barba, Color, Combos, Tratamientos.

---

---

---

# PARTE 2 — Fotos de Perfil de los Barberos

## Contexto

Las fotos actuales de los 3 barberos son imágenes de Unsplash que parecen empleados de una startup tecnológica. Necesitan ser reemplazadas por retratos auténticos que transmitan: **oficio, calle, orgullo, precisión**. Hombres latinoamericanos que se ven como lo que son — artesanos del cabello con personalidad propia.

Las fotos se usan como `background-image` en cards del storefront (ancho completo, 256px de alto, recortadas al centro). Formato recomendado: cuadrado o portrait, persona centrada.

### Dónde se guardan
- **Colección:** `professionals`
- **Campo:** `avatar`
- **IDs a actualizar:**

```
Carlos "El Pulpo" Ramírez : 69cb464e6eaab4b458348203
Miguel Ángel Torres        : 69cb464e6eaab4b458348204
José Luis Mendoza          : 69cb464e6eaab4b458348205
```

---

## PASO 5 — Genera las fotos de perfil con Nanobanana

---

### FOTO A — Carlos "El Pulpo" Ramírez
**Especialidades:** Degradados, diseños, barba | **10+ años de experiencia**

"El Pulpo" es el veterano. El apodo viene de sus manos — rápidas, precisas, que parecen tener vida propia. Es el tipo que llegó a la barbería adolescente mirando cómo trabajaban los mayores y nunca se fue. Serio, tatuado, el que los demás barberos respetan en silencio.

**Prompt Nanobanana:**
```
Photorealistic portrait of a Latin Hispanic male barber, mid to late 30s, stocky and strong build. He has several visible tattoos on both forearms — traditional style ink. Short dark hair with a sharp low fade on himself. Thick, well-groomed full beard. He's wearing a fitted black barber apron over a plain dark t-shirt. He stands with arms crossed or leans against a vintage barber chair, holding a pair of professional hair clippers in one hand at his side. Expression: serious, confident, direct eye contact — the look of someone who has mastered their craft. Background: dark premium barbershop interior — moody, dramatic side lighting from the left, golden amber accents from Edison bulbs behind him, dark wood and leather visible, slightly blurred. The overall mood is masculine, street-credible, authoritative. Style: professional editorial portrait, sharp focus on face and tattoos. Aspect ratio 1:1.
```

---

### FOTO B — Miguel Ángel Torres
**Especialidades:** Cortes Clásicos, Afeitado con Navaja, Cejas

Miguel Ángel es el maestro clásico. Aprendió el oficio de su padre en una barbería de barrio que olía a talco y brillantina. Lleva 20 años perfeccionando el mismo corte. No sigue tendencias — las tendencias vuelven a él. Tiene manos de cirujano y la paciencia de un sastre.

**Prompt Nanobanana:**
```
Photorealistic portrait of a Latin Hispanic male barber, late 40s to early 50s, distinguished and refined. Silver-streaked dark hair, neatly combed back with a classic side part. Well-groomed short salt-and-pepper beard, perfectly shaped. He wears a crisp white classic barber coat (like a traditional barbero uniform) with two breast pockets, very clean. He holds a gleaming vintage straight razor open in his right hand, blade facing down, displayed with quiet pride — like a craftsman showing his tool. Expression: calm, warm, authoritative — the dignity of someone who has done this with excellence for decades. Slight knowing smile. Background: classic barbershop setting — antique barber mirror with ornate frame, dark wood shelves with grooming products, warm incandescent lighting, slightly blurred. Mood: timeless, trustworthy, master craftsman. Style: editorial barbershop portrait, elegant composition. Aspect ratio 1:1.
```

---

### FOTO C — José Luis Mendoza
**Especialidades:** Estilos Urbanos, Líneas, Tintes | **Joven talento**

José Luis tiene 27 años y aprendió en YouTube antes de aprender en una silla. Sigue a los mejores barberos del mundo en Instagram y sabe exactamente qué está pasando en Miami, Medellín y Madrid. Es el que atiende a los jóvenes del barrio que quieren verse como sus artistas favoritos. Tiene energía, tiene hambre, tiene flow.

**Prompt Nanobanana:**
```
Photorealistic portrait of a young Latin Hispanic male barber, mid to late 20s, slim athletic build with natural style. He has a sharp low skin fade on himself with 2-3 inches of textured curly/wavy hair on top, slightly styled. Small gold stud earring in one ear. A thin gold chain visible at the collar. He wears a fitted dark barber apron over a clean white tee. He's in motion — mid-action, holding professional clippers up near his face or ear level as if about to work, looking directly at the camera with a confident, slightly cocky smile. One small tattoo visible on the forearm or hand. Expression: energetic, charismatic, hungry — the young gun who wants to be the best. Background: modern premium barbershop with dark tones and a pop of warm neon or gold light behind him, urban and stylish, slightly blurred. Style: dynamic, energetic editorial portrait, urban barbershop vibe. Aspect ratio 1:1.
```

---

## PASO 6 — Script de actualización de avatares

Después de generar las 3 fotos, ejecuta este script. **Sustituye `AVATAR_URL_X` con la URL o base64 de cada foto.**

```javascript
const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

// ============================================================
// SUSTITUYE con las URLs/base64 de Nanobanana
// ============================================================
const AVATARS = {
  elPulpo  : 'AVATAR_URL_A',   // Carlos "El Pulpo" Ramírez
  miguel   : 'AVATAR_URL_B',   // Miguel Ángel Torres
  joseLuis : 'AVATAR_URL_C',   // José Luis Mendoza
};
// ============================================================

const IDS = {
  elPulpo  : new ObjectId('69cb464e6eaab4b458348203'),
  miguel   : new ObjectId('69cb464e6eaab4b458348204'),
  joseLuis : new ObjectId('69cb464e6eaab4b458348205'),
};

const TENANT_ID = new ObjectId('69c71e7840187515237b821f');

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');
    const db = client.db('test');
    const col = db.collection('professionals');

    // Verificar tenant
    const tenant = await db.collection('tenants').findOne({ _id: TENANT_ID });
    if (tenant?.name !== 'Barbería Savage') {
      throw new Error(`❌ Tenant incorrecto: "${tenant?.name}". ABORTANDO.`);
    }
    console.log('✅ Tenant verificado:', tenant.name);

    // Validar que todas las URLs están definidas
    const missing = Object.entries(AVATARS).filter(([, v]) => v.startsWith('AVATAR_URL_'));
    if (missing.length > 0) {
      throw new Error(`❌ FALTAN AVATARES: ${missing.map(([k]) => k).join(', ')}. Sustituye todos antes de ejecutar.`);
    }

    // Verificar que los 3 profesionales pertenecen a este tenant antes de modificar
    for (const [key, id] of Object.entries(IDS)) {
      const pro = await col.findOne({ _id: id, tenantId: TENANT_ID });
      if (!pro) throw new Error(`❌ Profesional "${key}" no encontrado en tenant Barbería Savage. ABORTANDO.`);
    }
    console.log('✅ Los 3 profesionales verificados en tenant correcto\n');

    // Actualizar avatares
    const updates = [
      { id: IDS.elPulpo,  name: 'Carlos "El Pulpo" Ramírez', avatar: AVATARS.elPulpo },
      { id: IDS.miguel,   name: 'Miguel Ángel Torres',        avatar: AVATARS.miguel },
      { id: IDS.joseLuis, name: 'José Luis Mendoza',          avatar: AVATARS.joseLuis },
    ];

    for (const { id, name, avatar } of updates) {
      await col.updateOne(
        { _id: id, tenantId: TENANT_ID },
        { $set: { avatar, updatedAt: new Date() } }
      );
      console.log(`✅ Avatar actualizado: ${name}`);
    }

    console.log('\n🎉 ¡Fotos de equipo actualizadas exitosamente!');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await client.close();
  }
}

run();
```

---

## PASO 7 — Verificación final de profesionales

```javascript
const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
async function verify() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const tenantId = new ObjectId('69c71e7840187515237b821f');
  const pros = await db.collection('professionals').find({ tenantId }).toArray();
  console.log('\n👥 Equipo Barbería Savage:\n');
  pros.forEach(p => {
    const avatarOk = p.avatar && !p.avatar.includes('unsplash');
    console.log(`  ${avatarOk ? '✅' : '❌'} ${p.name}`);
    console.log(`     Avatar: ${p.avatar?.substring(0, 60)}...`);
  });
  await client.close();
}
verify().catch(console.error);
```

**Resultado esperado:** Los 3 muestran ✅ y ninguna URL contiene "unsplash".

---

## Resumen de lo que NO debes hacer

- ❌ NO borres items de otros tenants
- ❌ NO modifiques la colección `tenants`, `users`, ni `storefrontconfigs`
- ❌ NO ejecutes ningún script si algún placeholder `IMAGE_URL_X` o `AVATAR_URL_X` quedó sin sustituir
- ❌ NO uses otro `tenantId` que no sea `69c71e7840187515237b821f`
- ❌ NO corras ningún script si el PASO 1 (verificación) falla
- ❌ NO uses `updateMany` para los avatares — actualiza cada profesional individualmente con su ID específico
