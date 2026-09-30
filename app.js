// URL base de la API de Camilo (Spring Boot en local)
var API_URL = "http://localhost:8080"; 

var codigoUsuario = localStorage.getItem("codigoUsuario") || null;
var estaTrabajando = false;

window.onload = function() {
  iniciarReloj();
  comprobarEstadoSesion();

  // Evento Formulario Login
  document.getElementById("formLogin").onsubmit = function(e) {
    e.preventDefault();
    var user = document.getElementById("inputUsuario").value;
    var pass = document.getElementById("inputPassword").value;
    hacerLogin(user, pass);
  };

  // Evento Botón Fichar Entrada/Salida
  document.getElementById("btnFichar").onclick = function() {
    if (estaTrabajando) {
      ficharSalida();
    } else {
      ficharEntrada();
    }
  };

  // Evento Cerrar Sesión
  document.getElementById("btnCerrarSesion").onclick = function() {
    cerrarSesion();
  };
};

// 1. LOGIN (POST /usuarios/login)
function hacerLogin(usuario, password) {
  fetch(API_URL + "/usuarios/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: usuario, contrasena: password }) 
  })
  .then(function(respuesta) {
    if (!respuesta.ok) { 
      throw new Error("Login incorrecto o credenciales no válidas."); 
    }
    return respuesta.text(); // Devuelve texto plano con el código de usuario
  })
  .then(function(codigoRecibido) {
    codigoUsuario = codigoRecibido.trim();
    localStorage.setItem("codigoUsuario", codigoUsuario);
    comprobarEstadoSesion();
  })
  .catch(function(error) {
    alert("Error de inicio de sesión: " + error.message);
  });
}

// 2. COMPROBAR FICHAJE ACTIVO (GET /fichajes/activo)
function comprobarFichajeActivo() {
  if (!codigoUsuario) return;

  fetch(API_URL + "/fichajes/activo", {
    method: "GET",
    headers: { "Codigo-X": codigoUsuario }
  })
  .then(function(respuesta) {
    if (!respuesta.ok) { return ""; }
    return respuesta.text();
  })
  .then(function(textoRespuesta) {
    if (textoRespuesta && textoRespuesta.trim().length > 0) {
      estaTrabajando = true;
    } else {
      estaTrabajando = false;
    }
    actualizarBotonYEstado();
    obtenerHistorialFichajes();
  })
  .catch(function(error) {
    console.error("Error al comprobar estado activo:", error);
  });
}

// 3. FICHAR ENTRADA (POST /fichajes/entrar) -> Ruta actualizada según chat de Camilo
function ficharEntrada() {
  fetch(API_URL + "/fichajes/entrar", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Codigo-X": codigoUsuario 
    }
  })
  .then(function(respuesta) {
    if (!respuesta.ok) { throw new Error("No se pudo fichar entrada (¿fichaje ya abierto?)"); }
    return respuesta.json();
  })
  .then(function(fichajeCreado) {
    estaTrabajando = true;
    actualizarBotonYEstado();
    obtenerHistorialFichajes();
  })
  .catch(function(error) {
    alert("Error al fichar entrada: " + error.message);
  });
}

// 4. FICHAR SALIDA (PATCH /fichajes/salir) -> Ruta actualizada según chat de Camilo
function ficharSalida() {
  fetch(API_URL + "/fichajes/salir", {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json",
      "Codigo-X": codigoUsuario 
    }
  })
  .then(function(respuesta) {
    if (!respuesta.ok) { throw new Error("No se pudo fichar salida (¿fichaje no activo?)"); }
    return respuesta.json();
  })
  .then(function(fichajeCerrado) {
    estaTrabajando = false;
    actualizarBotonYEstado();
    obtenerHistorialFichajes();
  })
  .catch(function(error) {
    alert("Error al fichar salida: " + error.message);
  });
}

// 5. OBTENER HISTORIAL (GET /fichajes)
function obtenerHistorialFichajes() {
  if (!codigoUsuario) return;

  fetch(API_URL + "/fichajes", {
    method: "GET",
    headers: { "Codigo-X": codigoUsuario }
  })
  .then(function(respuesta) {
    if (!respuesta.ok) {
      return []; // Manejo del error 500 cuando el usuario no tiene fichajes registrados
    }
    return respuesta.json();
  })
  .then(function(listaFichajes) {
    cargarTabla(listaFichajes);
  })
  .catch(function(error) {
    console.error("Error al obtener el historial:", error);
  });
}

// PINTAR LA TABLA DE RESULTADOS
function cargarTabla(listaFichajes) {
  var tbody = document.getElementById("tablaBody");
  tbody.innerHTML = "";

  if (!listaFichajes || listaFichajes.length === 0) {
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>No hay fichajes registrados</td></tr>";
    return;
  }

  for (var i = 0; i < listaFichajes.length; i++) {
    var item = listaFichajes[i];

    var minsTotal = item.totalMinutos || 0;
    var horas = Math.floor(minsTotal / 60);
    var minutos = minsTotal % 60;
    var totalFormateado = horas + "h " + minutos + "m";

    var entradaFormateada = formatearFechaISO(item.fechaHoraEntrada);
    var salidaFormateada = item.fechaHoraSalida ? formatearFechaISO(item.fechaHoraSalida) : "<em>En curso...</em>";

    var fila = "<tr>" +
                 "<td>" + item.id + "</td>" +
                 "<td>" + entradaFormateada + "</td>" +
                 "<td>" + salidaFormateada + "</td>" +
                 "<td>" + totalFormateado + "</td>" +
               "</tr>";
               
    tbody.innerHTML += fila;
  }
}

// FUNCIÓN AUXILIAR: Formatear fechas ISO 8601
function formatearFechaISO(fechaCadena) {
  if (!fechaCadena) return "-";
  
  var d = new Date(fechaCadena);
  if (isNaN(d.getTime())) {
    return fechaCadena;
  }

  var dia = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
  var mes = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
  var hora = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
  var min = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();

  return dia + "/" + mes + " " + hora + ":" + min;
}

// CONTROL DE VISTAS SEGÚN SESIÓN
function comprobarEstadoSesion() {
  var bloqueLogin = document.getElementById("bloqueLogin");
  var bloqueFichaje = document.getElementById("bloqueFichaje");
  var labelUsuario = document.getElementById("labelUsuario");

  if (codigoUsuario != null) {
    bloqueLogin.style.display = "none";
    bloqueFichaje.style.display = "block";
    labelUsuario.innerHTML = "Código activo: <b>" + codigoUsuario + "</b>";
    comprobarFichajeActivo();
  } else {
    bloqueLogin.style.display = "block";
    bloqueFichaje.style.display = "none";
    labelUsuario.innerHTML = "Estado: No identificado";
  }
}

// ACTUALIZAR ASPECTO DEL BOTÓN
function actualizarBotonYEstado() {
  var texto = document.getElementById("textoEstado");
  var boton = document.getElementById("btnFichar");

  if (estaTrabajando) {
    texto.innerHTML = "<b style='color:green'>DENTRO (Turno Activo)</b>";
    boton.innerHTML = "FICHAR SALIDA";
    boton.className = "btn btn-salida";
  } else {
    texto.innerHTML = "<b style='color:red'>FUERA (Fuera de Turno)</b>";
    boton.innerHTML = "FICHAR ENTRADA";
    boton.className = "btn btn-entrada";
  }
}

function cerrarSesion() {
  codigoUsuario = null;
  localStorage.removeItem("codigoUsuario");
  comprobarEstadoSesion();
}

function iniciarReloj() {
  setInterval(function() {
    var f = new Date();
    var h = f.getHours(); var m = f.getMinutes(); var s = f.getSeconds();
    if (h < 10) h = "0" + h;
    if (m < 10) m = "0" + m;
    if (s < 10) s = "0" + s;
    document.getElementById("reloj").innerHTML = h + ":" + m + ":" + s;
  }, 1000);
}
