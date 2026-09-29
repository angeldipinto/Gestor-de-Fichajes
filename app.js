// URL base del backend en Spring Boot
var API_URL = "http://localhost:8080/api"; 

var codigoUsuario = localStorage.getItem("codigoUsuario") || null;
var estaTrabajando = false;

window.onload = function() {
  iniciarReloj();
  comprobarEstadoSesion();

  // Evento Login
  document.getElementById("formLogin").onsubmit = function(e) {
    e.preventDefault();
    var user = document.getElementById("inputUsuario").value;
    var pass = document.getElementById("inputPassword").value;
    hacerLogin(user, pass);
  };

  // Evento Fichar
  document.getElementById("btnFichar").onclick = function() {
    fichar();
  };

  // Evento Cerrar Sesión
  document.getElementById("btnCerrarSesion").onclick = function() {
    cerrarSesion();
  };
};

// 1. Petición HTTP POST para Iniciar Sesión
function hacerLogin(usuario, password) {
  fetch(API_URL + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: usuario, password: password })
  })
  .then(function(respuesta) {
    if (!respuesta.ok) { throw new Error("Usuario o contraseña incorrectos"); }
    return respuesta.text();
  })
  .then(function(codigoRecibido) {
    codigoUsuario = codigoRecibido;
    localStorage.setItem("codigoUsuario", codigoUsuario);
    comprobarEstadoSesion();
  })
  .catch(function(error) {
    alert(error.message);
  });
}

// 2. Petición HTTP GET para obtener el historial (ListadoFichajesDto)
function obtenerFichajesServidor() {
  if (!codigoUsuario) return;

  fetch(API_URL + "/fichajes?codigo=" + codigoUsuario)
  .then(function(respuesta) {
    return respuesta.json();
  })
  .then(function(listaDto) {
    cargarTabla(listaDto);
  })
  .catch(function(error) {
    console.error("Error al cargar fichajes:", error);
  });
}

// 3. Petición HTTP POST para registrar entrada/salida
function fichar() {
  if (!codigoUsuario) return;

  fetch(API_URL + "/fichar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo: codigoUsuario })
  })
  .then(function(respuesta) {
    if (!respuesta.ok) { throw new Error("Error al fichar"); }
    estaTrabajando = !estaTrabajando;
    actualizarBotonYEstado();
    obtenerFichajesServidor();
  })
  .catch(function(error) {
    alert(error.message);
  });
}

// Rellena la tabla con los datos del servidor
function cargarTabla(listaDto) {
  var tbody = document.getElementById("tablaBody");
  tbody.innerHTML = "";

  for (var i = 0; i < listaDto.length; i++) {
    var item = listaDto[i];

    // Calcula horas y minutos a partir del totalMinutos devuelto por Java
    var horas = Math.floor(item.totalMinutos / 60);
    var minutos = item.totalMinutos % 60;
    var totalFormateado = horas + "h " + minutos + "m";

    var salidaTexto = item.fechaHoraSalida ? item.fechaHoraSalida : "<em>En curso...</em>";

    var fila = "<tr>" +
                 "<td>" + item.id + "</td>" +
                 "<td>" + item.fechaHoraEntrada + "</td>" +
                 "<td>" + salidaTexto + "</td>" +
                 "<td>" + totalFormateado + "</td>" +
               "</tr>";
               
    tbody.innerHTML += fila;
  }
}

// Muestra/Oculta vistas según si hay un código guardado
function comprobarEstadoSesion() {
  var bloqueLogin = document.getElementById("bloqueLogin");
  var bloqueFichaje = document.getElementById("bloqueFichaje");
  var labelUsuario = document.getElementById("labelUsuario");

  if (codigoUsuario != null) {
    bloqueLogin.style.display = "none";
    bloqueFichaje.style.display = "block";
    labelUsuario.innerHTML = "Código activo: <b>" + codigoUsuario + "</b>";
    obtenerFichajesServidor();
  } else {
    bloqueLogin.style.display = "block";
    bloqueFichaje.style.display = "none";
    labelUsuario.innerHTML = "Estado: No identificado";
  }
}

// Alterna los estilos del botón rápido
function actualizarBotonYEstado() {
  var texto = document.getElementById("textoEstado");
  var boton = document.getElementById("btnFichar");

  if (estaTrabajando == true) {
    texto.innerHTML = "<b style='color:green'>DENTRO (Trabajando)</b>";
    boton.innerHTML = "FICHAR SALIDA";
    boton.className = "btn btn-salida";
  } else {
    texto.innerHTML = "<b style='color:red'>FUERA (Fuera de turno)</b>";
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
    var h = f.getHours();
    var m = f.getMinutes();
    var s = f.getSeconds();
    
    if (h < 10) h = "0" + h;
    if (m < 10) m = "0" + m;
    if (s < 10) s = "0" + s;

    document.getElementById("reloj").innerHTML = h + ":" + m + ":" + s;
  }, 1000);
}