# AprendeIA - Plataforma de aprendizaje con IA

AprendeIA es un prototipo web para un trabajo de Interaccion Hombre-Maquina. La propuesta muestra una plataforma educativa que usa inteligencia artificial para responder dudas, recomendar rutas de estudio y mejorar la experiencia del estudiante.

## Que incluye

- Panel principal del estudiante.
- Cursos activos.
- Evaluacion interactiva con retroalimentacion.
- Visualizacion de progreso.
- Seccion de propuesta lista para explicar en el informe.
- Asistente IA con dos modos:
  - Modo demo, funciona sin configurar nada.
  - Modo Gemini, usa la API de Gemini desde un servidor local.

## Como abrirlo sin Gemini

Puedes abrir `index.html` directamente en el navegador. En este modo el asistente funciona con respuestas de demostracion.

## Como abrirlo con Gemini

Necesitas tener Node.js instalado.

1. Abre una terminal en la carpeta del proyecto.
2. Crea una copia del archivo `.env.example` y llamala `.env`.
3. Abre `.env` y pega tu clave:

```env
GEMINI_API_KEY=tu_clave_de_gemini
GEMINI_MODEL=gemini-2.5-flash
```

4. Ejecuta:

```bash
npm start
```

5. Abre en el navegador:

```text
http://localhost:3000
```

Si la clave esta bien configurada, el indicador del prototipo cambiara de `Demo` a `Gemini`.

## Si sale error de puerto ocupado

Si aparece `EADDRINUSE: address already in use :::3000`, significa que ya hay otra ventana usando el puerto 3000.

Solucion rapida:

```bash
npm run start:3001
```

Luego abre:

```text
http://localhost:3001
```

Tambien puedes cerrar la terminal anterior donde dejaste corriendo `npm start` y volver a ejecutar `npm start`.

## Si sigue apareciendo modo demo

Revisa que tu archivo `.env` no tenga el texto de ejemplo. Debe tener una clave real:

```env
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```

Si dice `TU_CLAVE_AQUI`, todavia no esta configurado.

## Donde conseguir la API key

Puedes obtener una clave desde Google AI Studio:

```text
https://aistudio.google.com/app/apikey
```

No pegues tu API key dentro de `index.html` ni `script.js`. Este proyecto usa `server.js` para protegerla mejor.

## Archivos principales

- `index.html`: estructura de la interfaz.
- `styles.css`: diseno visual de la plataforma.
- `script.js`: interacciones del prototipo y comunicacion con el asistente.
- `server.js`: servidor local que conecta con Gemini.
- `.env.example`: ejemplo para configurar la API key.

## Imagenes recomendadas para el informe

1. Pantalla principal

Texto sugerido:

> La pantalla principal presenta el resumen del estudiante, su progreso y una ruta de aprendizaje recomendada por inteligencia artificial.

2. Asistente IA con Gemini

Texto sugerido:

> El asistente IA permite resolver dudas de forma inmediata y ofrecer explicaciones personalizadas, mejorando la interaccion entre el usuario y la plataforma.

3. Seccion de cursos

Texto sugerido:

> La seccion de cursos organiza los contenidos disponibles y permite solicitar rutas de estudio segun las necesidades del estudiante.

4. Evaluacion interactiva

Texto sugerido:

> La evaluacion ofrece retroalimentacion inmediata despues de la respuesta del usuario, aplicando un principio clave de Interaccion Hombre-Maquina.

5. Progreso del estudiante

Texto sugerido:

> La visualizacion del progreso permite identificar fortalezas y areas que necesitan refuerzo.

6. Seccion Propuesta

Texto sugerido:

> La seccion de propuesta resume el problema, la solucion, los usuarios y el aporte del proyecto desde la perspectiva de IHM.

## Relacion con Interaccion Hombre-Maquina

El prototipo aplica principios de IHM porque:

- Mejora la usabilidad con una navegacion clara.
- Reduce la carga cognitiva al organizar la informacion en secciones simples.
- Ofrece retroalimentacion inmediata en la evaluacion y el chat.
- Apoya la accesibilidad con buen contraste y textos directos.
- Personaliza el aprendizaje mediante recomendaciones.
- Integra interaccion humano-IA a traves del tutor inteligente.

## Explicacion corta para defender el proyecto

> AprendeIA es una plataforma educativa asistida por inteligencia artificial que busca mejorar la experiencia del estudiante mediante recomendaciones personalizadas, retroalimentacion inmediata y un tutor inteligente conectado a Gemini. Desde Interaccion Hombre-Maquina, el proyecto se enfoca en crear una interfaz clara, accesible y facil de usar, reduciendo la carga cognitiva y fortaleciendo la comunicacion entre el usuario, la plataforma y la IA.
