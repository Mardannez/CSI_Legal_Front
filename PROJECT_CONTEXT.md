# Contexto del Proyecto CSI Legal

## Proposito

Sistema web para administrar requisitos legales por pais y ejecutar evaluaciones anuales de cumplimiento para empresas. El flujo principal es:

1. Login y carga de sesion del usuario.
2. Seleccion de pais.
3. Seleccion de empresa del pais.
4. Dashboard de cumplimiento legal de la empresa.
5. Inicio, actualizacion y seguimiento de evaluaciones.
6. Mantenimiento administrativo de paises, empresas/proyectos, requisitos, usuarios, roles, permisos y licencias.

## Stack

- Next.js 15 con App Router.
- React 19.
- TypeScript.
- Tailwind CSS.
- Recharts para graficos.
- Autenticacion via JWT guardado en `localStorage`.
- API backend configurada con `NEXT_PUBLIC_API_URL`; algunos componentes usan fallback `http://localhost:4000`.

## Estructura Relevante

- `src/context/AuthContext.tsx`: proveedor global de sesion, login, logout, permisos y redireccion inicial.
- `src/lib/api.ts`: helper central `apiFetch` para requests con token y manejo de 401.
- `src/lib/auth-storage.ts`: llaves `CSI_Legal_token` y `CSI_Legal_user`.
- `src/components/common/UserContextMenu.tsx`: menu de usuario y accesos administrativos. Solo muestra administracion a `isGlobalAdmin` o rol `SUPER_ADMIN`.
- `src/app/countries-selection`: seleccion de paises desde API.
- `src/app/company-selection`: seleccion de empresas desde API.
- `src/app/company-dashboard`: evaluacion activa, KPIs, grafico, tabla de requisitos, estados, detalle, evidencias, responsables y eventos.
- `src/app/requirements-maintenance`: CRUD de requisitos, referencias legales y PDFs de leyes.
- `src/app/user-management`: usuarios, empresas asignadas, roles globales y roles por empresa.
- `src/app/roles-management`: roles y asignacion de permisos.
- `src/app/permissions-management`: permisos.
- `src/app/license-management`: licencias por empresa.
- `src/app/country-management`: aun usa datos mock.
- `src/app/project-maintenance`: aun usa datos mock.

## Modelo de Sesion y Permisos

`AuthContext` espera que `/api/auth/me` devuelva:

- `user`: datos base del usuario.
- `rolesGlobales` y `permisosGlobales`.
- `isGlobalAdmin`.
- `empresaActivaSugerida`.
- `empresas`: empresas asignadas con `idEmpresa`, pais, roles y permisos.
- `landingPage`.

La funcion `resolveFrontendLandingPage` traduce rutas antiguas del backend:

- `/paises` -> `/countries-selection`
- `/empresas/:id/dashboard` -> `/company-dashboard?companyId=:id`

Los permisos de empresa se consultan con `hasEmpresaPermission(empresaId, permiso)`. En el dashboard destacan:

- `EVALUACIONES_EDITAR`: iniciar evaluacion, guardar cambios generales, editar detalle.
- `REQUISITOS_ESTADO_EDITAR`: cambiar estado de requisitos evaluados.

## Endpoints Consumidos

Autenticacion:

- `POST /api/auth/login`
- `GET /api/auth/me`

Paises y empresas:

- `GET /api/paises`
- `GET /api/empresas`
- `GET /api/empresas?paisId=:id`
- `GET /api/empresas/:id`

Evaluaciones:

- `GET /api/evaluaciones/dashboard?companyId=:id`
- `POST /api/evaluaciones/iniciar`
- `PUT /api/evaluaciones/:evaluacionId/guardar-cambios`
- `PUT /api/evaluaciones/detalle/:detalleId/estado`
- `GET/PUT /api/evaluaciones/detalle/:detalleId/informacion`
- `GET/POST /api/evaluaciones/detalle/:detalleId/evidencias`
- `GET /api/evaluaciones/evidencias/:id/download`
- `DELETE /api/evaluaciones/evidencias/:id`
- `GET/POST /api/evaluaciones/detalle/:detalleId/eventos`
- `DELETE /api/evaluaciones/eventos/:id`
- `GET/POST /api/evaluaciones/detalle/:detalleId/responsables`
- `GET /api/evaluaciones/detalle/:detalleId/responsables/disponibles`
- `POST /api/evaluaciones/detalle/:detalleId/responsables/nuevo`
- `DELETE /api/evaluaciones/requisito-responsables/:id`

Catalogos y requisitos:

- `GET /api/estados-requisito`
- `GET /api/periocidad`
- `GET /api/subcategorias/options`
- `GET /api/requisitos`
- `GET/POST /api/requisitos-mantenimiento`
- `PUT/DELETE /api/requisitos-mantenimiento/:id`
- `GET/POST /api/requisitos-mantenimiento/requisitos/:id/referencias-legales`
- `PUT/DELETE /api/requisitos-mantenimiento/referencias-legales/:id`
- `GET/POST /api/requisitos-mantenimiento/referencias-legales/:id/leyes`
- `GET /api/requisitos-mantenimiento/leyes/:id/download`
- `DELETE /api/requisitos-mantenimiento/leyes/:id`

Administracion:

- `/api/usuarios...`
- `/api/roles...`
- `/api/permisos...`
- `/api/licencias...`

## Estado Actual del Frontend

Pantallas conectadas a API real:

- Login.
- Seleccion de pais.
- Seleccion de empresa.
- Dashboard de empresa.
- Mantenimiento de requisitos.
- Usuarios.
- Roles.
- Permisos.
- Licencias.

Pantallas pendientes o parcialmente legacy:

- `country-management` mantiene paises en memoria con `mockCountries`.
- `project-maintenance` mantiene proyectos/paises/usuario en memoria con mocks.
- Varias pantallas duplican helpers `apiFetch` locales en vez de usar `src/lib/api.ts`.
- Hay textos con mojibake (`paÃ­s`, `evaluaciÃ³n`, etc.) en varios archivos; conviene corregir codificacion de forma controlada.

## Riesgos Tecnicos a Recordar

- `src/lib/api.ts` no tiene fallback si `NEXT_PUBLIC_API_URL` esta vacio; algunos componentes si usan fallback. Unificar esto evitaria requests a `undefined/api/...`.
- Hay mucho fetch manual con token desde `localStorage`; conviene consolidarlo para errores 401, JSON vacio, FormData y descargas.
- El proyecto tiene comentarios largos y repetidos en componentes grandes; cualquier cambio debe ser muy localizado para no introducir regresiones de hooks.
- `CompanyDashboardInteractive.tsx`, `ItemDetailModal.tsx` y `RequirementsMaintenanceInteractive.tsx` concentran gran parte del dominio y deben editarse con cuidado.
- Git marca el repo como `dubious ownership` para el usuario actual. Para usar `git status` habria que configurar `safe.directory` si el usuario lo autoriza.

## Comandos Utiles

- Desarrollo: `npm run dev` en puerto `4028`.
- Build: `npm run build`.
- Type-check: `npm run type-check`.
- Lint: `npm run lint`.

