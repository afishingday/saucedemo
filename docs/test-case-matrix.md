# Matriz de casos de prueba — Flujo de compra E2E (SauceDemo)

AUT: https://www.saucedemo.com/

| ID | Tipo | Título | Precondiciones | Pasos | Resultado esperado | Automatizado en |
|----|------|--------|-----------------|-------|---------------------|------------------|
| TC-01 | Happy Path | Un usuario estándar completa una compra de principio a fin | Estar en `https://www.saucedemo.com/` (sin sesión iniciada) | 1. Iniciar sesión con `standard_user` / `secret_sauce`.<br>2. En Products, agregar "Sauce Labs Backpack" al carrito.<br>3. Abrir el carrito y hacer clic en Checkout.<br>4. Completar First Name, Last Name y Zip/Postal Code, y hacer clic en Continue.<br>5. Hacer clic en Finish. | Se navega correctamente por `inventory.html` → `checkout-step-one.html` → `checkout-step-two.html` → `checkout-complete.html`, el badge del carrito muestra "1" tras agregar el producto, y la pantalla final muestra el mensaje "Thank you for your order!". | `tests/happy-path-purchase.spec.ts` |
| TC-02 | Negativo / error | Un usuario bloqueado (`locked_out_user`) no puede iniciar sesión | Estar en `https://www.saucedemo.com/` (sin sesión iniciada) | 1. Ingresar `locked_out_user` / `secret_sauce`.<br>2. Hacer clic en Login. | Se muestra el mensaje de error "Epic sadface: Sorry, this user has been locked out." y la URL permanece en la pantalla de login (no se otorga sesión). | `tests/login-invalid-credentials.spec.ts` |
| TC-03 | Límite / error | El checkout no avanza si falta un campo requerido (Postal Code vacío) | Sesión iniciada como `standard_user`, con "Sauce Labs Backpack" ya en el carrito, en `checkout-step-one.html` | 1. Completar First Name y Last Name.<br>2. Dejar Zip/Postal Code vacío.<br>3. Hacer clic en Continue. | Se muestra el mensaje de error "Error: Postal Code is required" y la URL permanece en `checkout-step-one.html` (no avanza a Overview). | `tests/checkout-incomplete-data.spec.ts` |

## Nota sobre el tercer escenario límite

El enunciado ofrece tres opciones para los dos casos límite/error: carrito vacío, credenciales inválidas o datos incompletos en checkout. Se eligieron **credenciales inválidas** (TC-02) y **datos incompletos en checkout** (TC-03) porque ejercitan dos capas de validación distintas de la aplicación (autenticación y validación de formulario) y dejan cubierto, de paso, el flujo positivo completo del carrito en TC-01.
