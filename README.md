# AnisakiGirl 💖

Un visualizador de fotos: todas las imágenes flotan por la pantalla, rebotando
suavemente entre corazones de todos los tipos. Funciona en ordenador y en móvil.

## Cómo añadir fotos nuevas

1. Copia las imágenes dentro de la carpeta **`fotos`** (o suéltalas en la carpeta
   principal, se moverán solas).
2. Haz doble clic en **`ACTUALIZAR.bat`**.
3. Espera 1-2 minutos: la web publicada se actualiza sola.

Formatos admitidos: `jpg`, `jpeg`, `png`, `gif`, `webp`, `avif`, `bmp`.

## Qué hace cada archivo

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página. |
| `styles.css` | El aspecto: fondo, tarjetas, corazones, visor. |
| `app.js` | El movimiento de las fotos, los corazones y el visor ampliado. |
| `photos.js` / `photos.json` | La lista de fotos (se generan solas). |
| `generar-lista.ps1` | Regenera esa lista. |
| `ACTUALIZAR.bat` | Regenera la lista y publica los cambios. |
| `BORRAR-REPO.bat` | Borra el repositorio y tumba la web (pide confirmación). |
| `fotos/` | Aquí van tus imágenes. |

## Detalles

- **Se adapta al número de fotos**: en pantalla flotan hasta 22 a la vez (12 en
  móvil) y se van turnando, así que acaban saliendo todas.
- **Detecta fotos nuevas sin republicar**: además de la lista generada, la página
  consulta la API pública de GitHub para ver si hay imágenes nuevas en `fotos/`.
- **Controles**: pausar el movimiento, mezclar y pantalla completa.
- **Visor**: toca una foto para verla grande; flechas del teclado o deslizar en
  el móvil para pasar, `Esc` o deslizar hacia abajo para cerrar.
- Toca el fondo para soltar un estallido de corazones.

## Cambiar el título

Edita la línea `<h1 class="cabecera__titulo">` de `index.html`.
