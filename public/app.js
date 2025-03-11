// Configuración de Firebase
firebase.initializeApp({
    apiKey: "",
    authDomain: "",
    projectId: ""
});

// Inicializar Firebase Authentication y Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Leer documentos y mostrar en la tabla
var tabla = document.getElementById('tabla');
db.collection("users").onSnapshot((querySnapshot) => {
    tabla.innerHTML = '';
    querySnapshot.forEach((doc) => {
        console.log(`${doc.id} => ${doc.data().doc}`);
        tabla.innerHTML += `
        <tr>
            <th scope="row">${doc.id}</th>
            <td>${doc.data().doc}</td>
            <td>${doc.data().name}</td>
            <td>${doc.data().saldo}</td>
            <td>${doc.data().depositado}</td> <!-- Mostrar depositado -->
            <td>${doc.data().tarjeta}</td> <!-- Mostrar tarjeta -->
            <td><button class="btn btn-danger" onclick="eliminar('${doc.id}')">Eliminar</button></td>
            <td>
                <button class="btn btn-warning" 
                    onclick="editar('${doc.id}', '${doc.data().doc}', '${doc.data().name}', '${doc.data().saldo}', '${doc.data().depositado}', '${doc.data().tarjeta}')">
                    Editar
                </button>
            </td>
        </tr>
        `;
    });
});

// Borrar documentos
function eliminar(id){
    db.collection("users").doc(id).delete().then(function() {
        console.log("Document successfully deleted!");
    }).catch(function(error) {
        console.error("Error removing document: ", error);
    });
}

// Mostrar los campos de edición y llenar con los datos
function editar(id, dni, nombre, total, depositado, tarjeta) {
    // Mostrar los campos de entrada
    document.getElementById('editFields').style.display = 'block';

    // Rellenar los campos con los datos
    document.getElementById('dni').value = dni;
    document.getElementById('nombre').value = nombre;
    document.getElementById('total').value = total;
    document.getElementById('depositado').value = depositado; // Nuevo campo
    document.getElementById('tarjeta').value = tarjeta; // Nuevo campo

    // Guardar el ID del documento a editar
    document.getElementById('boton').onclick = function() {
        guardarEdicion(id);
    };

    // Hacer scroll hasta la sección de edición de forma suave
    document.getElementById('editFields').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
}



// Función para guardar la edición
// Función para guardar la edición en Firebase
// Función para guardar la edición en Firebase y mostrar mensaje de éxito
function guardarEdicion(id) {
    var dni = parseInt(document.getElementById('dni').value, 10);
    var nombre = document.getElementById('nombre').value;
    var total = parseFloat(document.getElementById('total').value);
    var depositado = parseFloat(document.getElementById('depositado').value);
    var tarjeta = parseFloat(document.getElementById('tarjeta').value);

    // Asegurar que los valores numéricos no sean NaN
    if (isNaN(depositado)) depositado = 0;
    if (isNaN(tarjeta)) tarjeta = 0;

    // Obtener el documento actual
    db.collection("users").doc(id).get()
    .then(function(doc) {
        if (doc.exists) {
            // Obtener el valor actual del campo depositado
            var currentDeposit = doc.data().depositado;

            // Sumar el depósito actual al valor existente
            var newDeposit = currentDeposit + depositado;

            // Actualizar el documento con el nuevo saldo
            db.collection("users").doc(id).update({
                doc: dni,
                name: nombre,
                saldo: total,
                depositado: newDeposit, // Usamos la suma acumulada
                tarjeta: tarjeta
            })
            .then(function() {
                console.log("Documento actualizado correctamente!");

                // Mostrar mensaje de éxito
                mostrarMensaje("¡Edición guardada exitosamente!", "success");

                // Ocultar los campos de edición después de guardar
                document.getElementById('editFields').style.display = 'none';

                // Limpiar los campos de entrada
                document.getElementById('dni').value = '';
                document.getElementById('nombre').value = '';
                document.getElementById('total').value = '';
                document.getElementById('depositado').value = '';
                document.getElementById('tarjeta').value = '';
            })
            .catch(function(error) {
                console.error("Error al actualizar el documento:", error);
                mostrarMensaje("Error al guardar la edición", "danger");
            });
        } else {
            console.log("Documento no encontrado!");
        }
    })
    .catch(function(error) {
        console.log("Error al obtener el documento:", error);
    });
}


// Función para mostrar un mensaje en pantalla
function mostrarMensaje(mensaje, tipo) {
    var mensajeDiv = document.getElementById('mensaje-exito');
    mensajeDiv.innerHTML = mensaje;
    mensajeDiv.className = `alert alert-${tipo} text-center`; // Aplica clases de Bootstrap
    mensajeDiv.style.display = 'block';

    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 3000);
}


// Función para leer el archivo Excel
// Función para leer el archivo Excel y almacenar en Firebase con "depositado" y "tarjeta"
function leerExcel(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    
    reader.onload = function(e) {
        var data = e.target.result;
        var workbook = XLSX.read(data, { type: 'binary' });
        
        // Asumiendo que los datos están en la primera hoja
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var json = XLSX.utils.sheet_to_json(sheet);
        
        // Verifica en consola los datos extraídos
        console.log("Datos del Excel:", json);
        
        // Guardar los datos en Firestore con "depositado" y "tarjeta"
        json.forEach(function(item) {
            var dni = item.dni;
            var nombre = item.nombre;
            var total = parseFloat(item.total); // Asegurarnos de que el total sea un número

            // Verificar si el usuario ya existe en la base de datos
            db.collection("users").where("doc", "==", dni).get()
            .then(function(querySnapshot) {
                if (querySnapshot.empty) {
                    // Si el usuario no existe, se agrega con los valores iniciales de depositado y tarjeta en 0
                    db.collection("users").add({
                        doc: dni,
                        name: nombre,
                        saldo: total,
                        depositado: 0,  // Nuevo campo agregado
                        tarjeta: 0      // Nuevo campo agregado
                    })
                    .then(function(docRef) {
                        console.log("Usuario agregado con ID:", docRef.id);
                    })
                    .catch(function(error) {
                        console.error("Error al agregar usuario:", error);
                    });
                } else {
                    // Si el usuario ya existe, solo actualizamos el saldo
                    querySnapshot.forEach(function(doc) {
                        var existingTotal = parseFloat(doc.data().saldo);
                        var newTotal = existingTotal + total;  // Se suma el saldo

                        // Se actualiza solo el saldo, pero depositado y tarjeta se mantienen
                        db.collection("users").doc(doc.id).update({
                            saldo: newTotal
                        })
                        .then(function() {
                            console.log("Saldo actualizado para usuario con DNI:", dni);
                        })
                        .catch(function(error) {
                            console.error("Error al actualizar saldo:", error);
                        });
                    });
                }
            })
            .catch(function(error) {
                console.error("Error verificando existencia de usuario:", error);
            });
        });
    };
    
    reader.readAsBinaryString(file);
}

// Registrar un nuevo usuario (DNI como usuario y contraseña)
function registrarUsuario() {
    var dni = document.getElementById('nuevoDni').value;
    var nombre = document.getElementById('nuevoNombre').value;

    const email = dni + "@dominio.com";  // Usar DNI como "correo electrónico"
    const password = dni;  // Usar el DNI como contraseña

    auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        // Registro exitoso
        const user = userCredential.user;
        console.log("Usuario registrado:", user);

        // Guardar los datos del usuario en Firestore
        /*db.collection("users").add({
            doc: dni,
            name: nombre,
            saldo: 0 // Inicializar saldo
        }).then(function(docRef) {
            console.log("Usuario guardado en Firestore con ID:", docRef.id);
        })
        .catch(function(error) {
            console.error("Error al guardar el usuario en Firestore:", error);
        });*/

        // Limpiar los campos
        document.getElementById('nuevoDni').value = '';
        document.getElementById('nuevoNombre').value = '';
    })
    .catch((error) => {
        console.error("Error registrando usuario:", error.message);
    });
}

// Función de login con DNI
/*function login() {
    var dni = document.getElementById('dni').value;
    var password = document.getElementById('password').value;

    const email = dni + "@dominio.com";  // DNI como correo
    const passwordInput = password;

    auth.signInWithEmailAndPassword(email, passwordInput)
    .then((userCredential) => {
        console.log("Usuario logueado:", userCredential.user);
        
        localStorage.setItem('dni', dni);
        window.location.href = "detalles.html"
        /*window.location.href = "detalles.html"; // Redirigir a detalles
        mostrarDatos(); */
   /* })
    .catch((error) => {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-message').textContent = "DNI o contraseña incorrectos";
    });
}

*/


// Función de login con DNI
function login() {
    var dni = document.getElementById('dni').value;  // Obtener el DNI del usuario
    var password = document.getElementById('password').value;  // Obtener la contraseña

    const email = dni + "@dominio.com";  // Crear el email con el DNI ingresado y agregar "@dominio.com"
    const passwordInput = password;  // La contraseña ingresada

    // Intentar iniciar sesión con el email y la contraseña ingresados
    auth.signInWithEmailAndPassword(email, passwordInput)
    .then((userCredential) => {
        console.log("Usuario logueado:", userCredential.user);
        
        // Verificar si el DNI es "909090" y redirigir a admin.html si es cierto
        if (dni === "909090") {
            localStorage.setItem('dni', dni);
            window.location.href = "admin.html";  // Redirigir al admin
            //document.getElementById('nombre-usuario').textContent = "DNI: " + dni;
            
        } else {
            // Si no es el admin, redirigir a detalles.html y guardar el DNI en localStorage
            localStorage.setItem('dni', dni); 
            window.location.href = "detalles.html"; 
        } 
    })
    .catch((error) => {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-message').textContent = "DNI o contraseña incorrectos";
    });
}

// Mostrar detalles del usuario logueado (solo el DNI)
function mostrarDatos() {
    // Verificar si el usuario está autenticado
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            var dni = user.email.split('@')[0];  // Extraer el DNI del correo
            console.log("Correo completo:", user.email);  // Verificar el correo completo
            console.log("DNI extraído:", dni);  // Verificar el DNI extraído
            document.getElementById('nombre-usuario').textContent = "DNI: " + dni;
        } else {
            console.log("No hay usuario autenticado.");
            document.getElementById('nombre-usuario').textContent = "No estás autenticado";
        }
    });
}
// Ejecutar la función cuando se carga la página
window.onload = function() {
    mostrarDatos();  // Mostrar el DNI del usuario logueado
};

// Función para cerrar sesión
function logout() {
    auth.signOut().then(() => {
        console.log("Usuario cerrado sesión");
        window.location.href = "index.html";
    }).catch((error) => {
        console.error("Error al cerrar sesión:", error);
    });
}

