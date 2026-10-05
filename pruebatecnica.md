Prueba Técnica — Desarrollador de Software Full
Stack Junior

1. Objetivo
   El candidato deberá desarrollar una aplicación web Full Stack para la gestión de solicitudes internas de
   soporte tecnológico.
   La prueba busca evaluar conocimientos de desarrollo frontend y backend, manejo de bases de datos,
   diseño de APIs, lógica de negocio, validaciones, control de versiones y capacidad para tomar y justificar
   decisiones técnicas.
2. Contexto
   Una organización requiere una aplicación que permita registrar y realizar seguimiento a solicitudes de
   soporte tecnológico.
   Cada solicitud deberá permitir identificar:
   Título.
   Descripción.
   Usuario solicitante.
   Categoría.
   Prioridad.
   Estado.
   Fecha de creación.
   Fecha de actualización.
   Las categorías disponibles serán:
   Hardware
   Software
   Red
   Accesos
   Otros
   Las prioridades disponibles serán:
   Baja
   Media
   Alta
   Crítica
   Los estados disponibles serán:
   Pendiente
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   •
   1
   En progreso
   Resuelta
   Cancelada
3. Funcionalidades requeridas
   La aplicación deberá permitir como mínimo:
   Crear solicitudes.
   Consultar solicitudes.
   Consultar el detalle de una solicitud.
   Editar solicitudes.
   Cambiar el estado de una solicitud.
   Eliminar o cancelar solicitudes.
   Consultar el historial de cambios de una solicitud.
   Buscar solicitudes.
   Filtrar por estado, prioridad y categoría.
   Ordenar los resultados.
   Paginar los resultados.
   Cada cambio de estado deberá quedar registrado en el historial de la solicitud, indicando como mínimo:
   Estado anterior.
   Estado nuevo.
   Fecha y hora.
   Usuario responsable.
   Observación, cuando corresponda.
4. Reglas de negocio
   La aplicación deberá contemplar reglas que permitan controlar las transiciones entre los diferentes
   estados de una solicitud.
   Como mínimo:
   Una solicitud pendiente podrá pasar a en progreso.
   Una solicitud en progreso podrá pasar a resuelta.
   Una solicitud pendiente podrá ser cancelada.
   Una solicitud cancelada no podrá volver a estar en progreso.
   Una solicitud resuelta no podrá volver a estar en progreso.
   Una solicitud con prioridad crítica deberá registrar una observación al ser resuelta.
   El candidato podrá implementar reglas adicionales si considera que aportan valor a la solución.
   Las decisiones adicionales deberán estar justificadas en la documentación del proyecto.
   tecnologias
   react, node, next, tailwind, typescript, postgresql y si tomas alguna otra tecnologias documentarla, de igul forma tienes que documentar todo
   6 arquitecturass
   arquitectura hexagonal, para el backend, arquitectura limpia para el frontend,  
   7 valiaciones
   La aplicación deberá implementar validaciones en:
   Frontend
   Los campos de los formularios deberán contar con las validaciones correspondientes.
   Backend
   El backend deberá implementar validaciones utilizando DTOs, Schemas, Validators o un mecanismo
   equivalente.
   Las validaciones deberán contemplar como mínimo:
   Campos obligatorios.
   Tipos de datos.
   Valores permitidos.
   Datos inválidos.
   Reglas necesarias para las operaciones solicitadas.
   8 control de vesiones, esste es el repositorio de el proyecto https://github.com/Thesergioandres/pruebatecnicauros
   debes tener

2 ramas, main y develop
se desarolla inicialmente de develop, tienes que hacer minimo 5 commits y cuando termines minimo un merge a main
Los commits deberán reflejar el proceso de desarrollo de la solución. 9. Documentación
El proyecto deberá incluir un README.md con la información necesaria para:
Instalar el proyecto.
•
•
•
•
•
•
•
•
•
•
•
•
•
•
4
Configurar las variables de entorno.
Configurar la base de datos.
Ejecutar frontend y backend.
Ejecutar la aplicación.
Conocer las principales decisiones técnicas.
También deberán documentarse los supuestos o decisiones tomadas cuando un requerimiento no se
encuentre definido explícitamente. 10. Uso de Inteligencia Artificial
El uso de herramientas de Inteligencia Artificial está permitido durante el desarrollo de la prueba.
Estas herramientas podrán utilizarse como apoyo para:
Consultar conceptos.
Investigar alternativas.
Generar código.
Revisar código.
Identificar errores.
Resolver problemas puntuales.
Sin embargo, su utilización deberá realizarse con moderación y como herramienta de apoyo al
desarrollo.
El candidato será responsable de la totalidad del código entregado y deberá comprender las soluciones
implementadas.
Durante una eventual revisión técnica, podrá solicitarse al candidato explicar o modificar cualquier
parte de la solución. 11. Funcionalidades opcionales
Las siguientes funcionalidades son opcionales y no son necesarias para completar la prueba:
Documentación de API
Implementación de documentación mediante:
Swagger / OpenAPI.
Otra tecnología equivalente.
Contenedorización
Implementación mediante:
Docker.
•
•
•
•
•
•
•
•
•
•
•
•
•
•
5
Docker Compose.
Otra tecnología equivalente.
Pruebas automatizadas
Implementación de pruebas unitarias.
Se recomienda:
Jest.
Otra tecnología equivalente.
Sistema de notificaciones
Implementación de un mecanismo de notificación cuando ocurran determinados eventos de la
aplicación.
La notificación podrá realizarse mediante:
Correo electrónico.
Notificaciones dentro del cliente.
WebSockets.
Webhooks.
Eventos.
Otra solución técnicamente justificable. 12. Entregables
El candidato deberá proporcionar:
URL del repositorio Git.
Instrucciones de ejecución mediante README.md .
Código fuente del frontend.
Código fuente del backend.
Configuración o scripts necesarios para la base de datos.
Archivo .env.example o equivalente.
