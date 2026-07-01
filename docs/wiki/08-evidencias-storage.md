# 08 - Evidencias Fotograficas y Storage

## Objetivo

Documentar captura, subida, serializacion y render de evidencias fotograficas.

## Bucket

Bucket activo:

```txt
evidencias-mantenimiento
```

No usar:

```txt
mantenimiento
```

## Campo Virtual

Clave:

```txt
evidencias_hvac
```

Uso:

- Fallback cuando la plantilla no incluye campo `field_type === 'evidence'`.
- Evita error `client_evidence_field_missing`.

## Formato Persistido

En `formularios_respuestas.valor_texto` se guarda un JSON string liviano:

```json
["https://.../image.png"]
```

Regla:

- No enviar `File`, `Buffer`, `Blob` ni base64 al Server Action.
- Solo URLs publicas o paths serializados.

## Preview Cliente

Durante seleccion de archivos:

```ts
URL.createObjectURL(file)
```

UI:

- Miniaturas 64x64.
- Borde sutil.
- Boton para remover antes de submit.

## Galeria RUI

Componente:

[`src/app/(app)/mantenimiento/[area]/evidence-photo-gallery.tsx`](../../src/app/%28app%29/mantenimiento/[area]/evidence-photo-gallery.tsx)

Funciones:

- Renderiza thumbnails.
- Abre modal full resolution.
- Renderiza placeholder GxP si no hay imagenes.
- Soporta impresion con `print:grid print:grid-cols-2`.

## Recuperacion de URLs

La vista puede parsear:

- JSON array de strings.
- Objeto con `path`.
- Objeto con `publicUrl`.
- URL directa.
- Path relativo del bucket.

## Riesgos

- URLs privadas fallaran si Storage no permite lectura publica.
- Payloads base64 pueden romper limites de Server Actions.
- El campo virtual debe mantenerse estable para lectura historica.

## Enlaces Relacionados

- [Mantenimiento, RUI y Ciclo de Vida](./05-mantenimiento-rui-ciclo-vida.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
