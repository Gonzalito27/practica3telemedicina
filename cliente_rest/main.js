var id_recurso_actual = null; //variable global para diferenciar entre editar/crear
var id_sanitario=null;
var nombre_gestor=null
var id_gestor_actual = null;

var token_actual = null;

function conToken(url) {
    if (url.indexOf("?") == -1) {
        return url + "?token=" + token_actual;
    }
    return url + "&token=" + token_actual;
}


function saludar(){
    rest.get(conToken("/api/gestores/"+id_gestor_actual), function(estado,respuesta){
        if (estado != 200) {
            alert("Error cargando la lista de hospitales");
            return;
        }
        else{
            var buenas = document.getElementById("buenas");
            buenas.innerHTML= "Hola "+respuesta.nombre+ " "+respuesta.apellido + " " +'<button onclick="editar_llevar()">Editar datos</button> '; //para button usar '
        }
    });
}


function entrar() {
    var login_entrar = {
        login : document.getElementById("usuario").value,
        password : document.getElementById("password").value
    };
    rest.post("/api/gestores/login", login_entrar, function (estado, respuesta) {
        if (estado == 200) { 
            nombre_gestor=login_entrar.login;
            id_gestor_actual = respuesta.id;
            token_actual = respuesta.token;     //esto lo dejo asi y ya o debo añadirlo a algun lado      
            cambiarSeccion("menu-principal");
            saludar();
            categoria();
            modelo();
            ubicacion();
            ws = new WebSocket("ws://localhost:4444", "avisos");
            ws.addEventListener("open", function() {
                console.log("Conectado al servidor de avisos");
                ws.send(JSON.stringify({ 
                    operacion: "identificar", 
                    tipo: "gestor", 
                    nombre: nombre_gestor
                }));
            });
            ws.addEventListener("message", function(msg) {
                msg = JSON.parse(msg.data);
                if(msg.operacion==="aviso_resena")
                    mostrarAviso_resena(msg); 
            });
            
        } else {
            alert("Error verificando el login");
        }

    });

} 

function mostrarAviso_resena(msg) {
    var cuerpoTabla = document.getElementById("cuerpo-tabla-avisos");
    var fila = document.createElement("tr");
    
    fila.style.backgroundColor = "green";
    fila.style.color = "white";

    var tdFecha = document.createElement("td");
    tdFecha.textContent = msg.fecha || new Date().toLocaleString();

    var tdOrigen = document.createElement("td");
    tdOrigen.textContent = msg.origen;

    var tdTexto = document.createElement("td");
    tdTexto.textContent = msg.texto;

    fila.appendChild(tdFecha);
    fila.appendChild(tdOrigen);
    fila.appendChild(tdTexto);

    cuerpoTabla.insertBefore(fila, cuerpoTabla.firstChild);
}

function prepararFecha(fechaTexto) {
    if (!fechaTexto) return ""; 
    let d = new Date(fechaTexto);
    return d.toLocaleString(); // Devuelve la fecha formateada
}

var datos_ministerio = [];   // global: aquí se juntan todas las reservas

function enviarMinisterio() {
    datos_ministerio = [];
    var fecha = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
    var reservas_faltan = 0;              
    var recursos_faltan = 0;

    rest.get(conToken("/api/recursos?categoria=&modelo=&ubicacion=&estado="), function(estado, recursos) {
        if (estado != 200) { 
            alert("Error cargando los recursos");
             return; 
        }
        recursos_faltan = recursos.length;

        for (let i = 0; i < recursos.length; i++) {
            let recurso = recursos[i];

            let categoria = "";
            if (recurso.modelo == 1 || recurso.modelo == 2) { categoria = "Termómetros"; }
            else if (recurso.modelo == 3) { categoria = "Estetoscopios"; }
            else if (recurso.modelo == 4) { categoria = "Desfibriladores"; }

            rest.get(conToken("/api/recursos/" + recurso.id + "/reservas"), function(est, reservas) {
                if (est != 200) {
                    alert("Error cargando las reservas");
                    return;
                }
                recursos_faltan--;
                reservas_faltan += reservas.length;

                for (let j = 0; j < reservas.length; j++) {
                    let r = reservas[j];

                    rest.get(conToken("/api/sanitarios/" + r.sanitario), function(est2, san) {
                        if (est2 != 200) {
                            alert("Error cargando el sanitario");
                            return;
                        }
                        reservas_faltan--;
                        datos_ministerio.push({
                            nombre: san.nombre,
                            apellidos: san.apellido,
                            "categoría": categoria,
                            horas_estimadas: r.horas_estimadas,
                            fec_pet: r.fecha_peticion,
                            fec_ini: r.fecha_inicio,
                            fecha_fin: r.fecha_fin 
                        });

                        if (recursos_faltan == 0 && reservas_faltan == 0) {
                            rest.post("https://undefined.ua.es/telemedicina/api/datos",
                                { id_area: 7, fecha: fecha, datos: datos_ministerio },
                                function(est3) {
                                    if (est3 != 200 && est3 != 201) {
                                        alert("Error enviando al Ministerio"); 
                                    }
                                    else {
                                        
                                         alert("Enviadas " + datos_ministerio.length + " reservas"); 
                                    }
                                });
                        }
                    });
                }
            });
        }
    });
}

function quitarRepetidas(lista) {
    var vistas = {};
    var sin_repetir = [];
    for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        var clave = r.area + "|" + r.d.nombre + "|" + r.d.apellidos + "|" + r.d["categoría"] + "|" +
                    r.d.horas_estimadas + "|" + r.d.fec_pet + "|" + r.d.fec_ini + "|" + r.d.fecha_fin;
        if (vistas[clave] !== true) {
            vistas[clave] = true;
            sin_repetir.push(r);
        }
    }
    return sin_repetir;
}

function nombreOk(v) {
    if (typeof v == "string" && v != "") {
        return true;
    }
    return false;
}

function categoriaOk(v) {
    if (typeof v == "string" && v != "") {
        return true;
    }
    return false;
}

function horasOk(v) {
    if (typeof v == "number" && v > 0) {
        return true;
    }
    return false;
}


function fechaOk(v) {
    if (typeof v != "string") {
        return false;
    }

    var dia = v.substring(0, 10);      
    var fecha = dia.split("-");

    if (fecha.length != 3) {
        return false;
    }

    if (fecha[0].length != 4 ||
        fecha[1].length != 2 ||
        fecha[2].length != 2) {
        return false;
    }

    if (isNaN(new Date(dia))) {
        return false;
    }

    return true;
}

function fechaOpcionalOk(v) {
    if (v == null || fechaOk(v)) {
        return true;
    }
    return false;
}

function inicioOk(d) {
    if (d.fec_ini == null ||
        new Date(d.fec_ini) >= new Date(d.fec_pet)) {
        return true;
    }
    return false;
}

function finOk(d) {
    if (d.fecha_fin == null) {
        return true;
    }

    if (d.fec_ini != null &&
        new Date(d.fecha_fin) >= new Date(d.fec_ini)) {
        return true;
    }
    return false;
}

function areaOk(a) {
    if (typeof a == "number" &&
        a >= 1 && a <= 18 ) {
        return true;
    }
    return false;
}

var AREAS = ["", "Alergología", "Anestesiología", "Cardiología", "Cirugía General",
    "Dermatología", "Aparato Digestivo", "Endocrinología", "Ginecología", "Hematología",
    "Medicina Interna", "Neumología", "Neurología", "Oftalmología", "Oncología",
    "Pediatría", "Psiquiatría", "Traumatología", "Urología"];

function cargarRanking() {
    rest.get("https://undefined.ua.es/telemedicina/api/datos", function(estado, registros) {
        if (estado != 200) {
            alert("Error leyendo los datos del Ministerio");
            return;
        }

        if(registros.length==0){
            alert("No se encontraron reservas");
            return;
        }

        var contador = [];
        for (var a = 0; a <= 18; a++) { 
            contador[a] = 0; 
        }

        var malas = 0;        // reservas con campos incorrectos
        var areas_malas = 0;  // registros con id_area inválido o sin array
        var buenas = [];

        for (var i = 0; i < registros.length; i++) {
            var area = registros[i].id_area;
            var datos = registros[i].datos;

            if (areaOk(area) && Array.isArray(datos)) {

                for (var j = 0; j < datos.length; j++) {
                    var d = datos[j];

                    if (typeof d == "object" && d != null && 
                        nombreOk(d.nombre) &&
                        nombreOk(d.apellidos) &&
                        categoriaOk(d["categoría"]) &&
                        horasOk(d.horas_estimadas) &&
                        fechaOk(d.fec_pet) &&
                        fechaOpcionalOk(d.fec_ini) &&
                        fechaOpcionalOk(d.fecha_fin) &&
                        inicioOk(d) &&
                        finOk(d)) {

                        buenas.push({ area: area, d: d });

                    } else {
                        malas++;
                    }
                }

            } else {
                areas_malas++;
            }
        }

        var unicas = quitarRepetidas(buenas);
        var repetidas = buenas.length - unicas.length;

        for (var u = 0; u < unicas.length; u++) {
            contador[unicas[u].area]++;
        }

        var lista = [];
        for (var k = 1; k <= 18; k++) {
                lista.push({ area: k, total: contador[k] });
            
        }
        lista.sort(function(x, y) { return y.total - x.total; });

        var cuerpo = document.getElementById("cuerpo-tabla-ranking");
        cuerpo.innerHTML = "";
        for (var n = 0; n < lista.length; n++) {
            var fila = document.createElement("tr");

            var td1 = document.createElement("td");
            td1.textContent = n + 1;
            fila.appendChild(td1);

            var td2 = document.createElement("td");
            td2.textContent = AREAS[lista[n].area];
            fila.appendChild(td2);

            var td3 = document.createElement("td");
            td3.textContent = lista[n].total;
            fila.appendChild(td3);

            cuerpo.appendChild(fila);
        }
        alert("Reservas incorrectas: " + malas + ", reservas repetidas: " + repetidas + ", registros con área inválida: " + areas_malas);
    });
}

function guardar() {
    var gestor = {
        nombre : document.getElementById("nombre").value,
        ape : document.getElementById("apellido").value,
        login : document.getElementById("usuario2").value,
        password : document.getElementById("password2").value
    };
    if (document.getElementById("nombre").value.trim() === "" ||
    document.getElementById("apellido").value.trim() === "" ||
    document.getElementById("usuario2").value.trim() === "" ||
    document.getElementById("password2").value === "") {
    alert("Cuidado: debes rellenar todos los campos");
    return;
}
    rest.post("/api/gestores", gestor, function (estado, respuesta) {
        if (estado == 201) { 
            cambiarSeccion("login");
            document.getElementById("usuario").value="";
            document.getElementById("password").value="";

        } else {
            alert("Error creando el gestor");
        }

    });

}

function editar() { 
    var gestor_editado = {
        nombre : document.getElementById("nombre3").value,
        ape : document.getElementById("apellido3").value,
        password : document.getElementById("password3").value
    };
    if (document.getElementById("nombre3").value.trim() === "" ||
    document.getElementById("apellido3").value.trim() === "" ||
    document.getElementById("password3").value === "") {
    alert("Cuidado: debes rellenar todos los campos");
    return;
}
    rest.put(conToken("/api/gestores/"+id_gestor_actual), gestor_editado, function (estado, respuesta) {
        if (estado == 200) { 
            saludar();
            cambiarSeccion("menu-principal");

        } else {
            alert("Error editando el gestor");
        }

    });

}

function obtenerAhora() { //suponemos ahora
    return new Date("2026-02-19T21:00:00");
}

function cargarSelect(url, selectId, incluirTodos) {
    rest.get(url, function(estado, respuesta){
        if (estado != 200) {
            alert("Error cargando " + url);
            return;
        }
        var select = document.getElementById(selectId);
        select.innerHTML = "";

        if (incluirTodos) {
            var optTodos = document.createElement("option");
            optTodos.value = "";
            optTodos.textContent = "Todos";
            select.appendChild(optTodos);
        }

        for (var i = 0; i < respuesta.length; i++) {
            var item = respuesta[i];
            var option = document.createElement("option");
            option.value = item.id;
            // nombre_modelo o nombre según el caso
            option.textContent = item.nombre_modelo || item.nombre;
            select.appendChild(option);
        }
    });
}


function categoria() {
    cargarSelect(conToken("/api/categorias"), "categoria", true);
}

function modelo() {
    cargarSelect(conToken("/api/modelos"), "modelo", true);
}

function ubicacion() {
    cargarSelect(conToken("/api/ubicaciones"), "ubicacion", true);
}

//En este caso no existe todos
function categoria2() {
    cargarSelect(conToken("/api/categorias"), "categoria2", false);
}

function modelo2(categoriaId,elegido) {
    rest.get(conToken("/api/modelos"), function(estado, respuesta) {
        if (estado != 200) return;
        var select = document.getElementById("modelo2");
        select.innerHTML = "";

        for (var i = 0; i < respuesta.length; i++) {
            var item = respuesta[i];
            // Si hay categoriaId, solo muestra los de esa categoría
            if (!categoriaId || item.categoria == categoriaId) {
                var option = document.createElement("option");
                option.value = item.id;
                option.textContent = item.nombre_modelo;
                select.appendChild(option);
            }
        }
        if (elegido) { select.value = elegido; }
    });
}

function ubicacion2() {
    cargarSelect(conToken("/api/ubicaciones"), "ubicacion2", false);
}



function buscar(){
    var categoria = document.getElementById("categoria").value;
    var ubicacion = document.getElementById("ubicacion").value;
    var modelo = document.getElementById("modelo").value; 
    var estado = document.getElementById("estado").value;

    if(categoria === "Todos"){ 
        categoria = ""};
    if(modelo === "Todos") {
        modelo = ""};
    if(ubicacion === "Todos"){ 
        ubicacion = ""};

    rest.get(conToken(`/api/recursos?categoria=${categoria}&modelo=${modelo}&ubicacion=${ubicacion}&estado=${estado}`), function(estado, respuesta) {
        if (estado != 200) {
            alert("Error al buscar el recurso");
            return;
        }
        else{


            var cuerpoTabla = document.getElementById("cuerpo-tabla");
            cuerpoTabla.innerHTML = ""; 

            for (let i = 0; i < respuesta.length; i++) {
                let recurso = respuesta[i];

                var fila = document.createElement("tr");

                var tdSerie = document.createElement("td");
                tdSerie.textContent = recurso.numero_serie; 
                fila.appendChild(tdSerie);

                var tdCat = document.createElement("td");
                if (recurso.modelo == 1 || recurso.modelo == 2) { tdCat.textContent = "Termómetros"; }
                else if (recurso.modelo == 3) { tdCat.textContent = "Estetoscopios"; }
                else if (recurso.modelo == 4) { tdCat.textContent = "Desfibriladores"; }
                fila.appendChild(tdCat);

                var tdMod = document.createElement("td");
                if (recurso.modelo == 1) { tdMod.textContent = "MNX-4"; }
                else if (recurso.modelo == 2) { tdMod.textContent = "MNX-5"; }
                else if (recurso.modelo == 3) { tdMod.textContent = "AST-8"; }
                else if (recurso.modelo == 4) { tdMod.textContent = "PEC-9"; }
                fila.appendChild(tdMod);

                var tdUbi = document.createElement("td");
                if (recurso.ubicacion == 1) {
                    tdUbi.textContent = "Almacén";
                } 
                else if (recurso.ubicacion == 2) {
                    tdUbi.textContent = "Sala";
                } 
                else if (recurso.ubicacion == 3) {
                    tdUbi.textContent = "Laboratorio";
                } 
                fila.appendChild(tdUbi);

                var tdEst = document.createElement("td");
                if (recurso.estado == 0) {
                    tdEst.textContent = "Operativo";
                } 
                else if (recurso.estado == 1) {
                    tdEst.textContent = "Defectuoso";
                } 
                else if (recurso.estado == 2) {
                    tdEst.textContent = "En mantenimiento";
                } 
                fila.appendChild(tdEst);
            

                var tdAcciones = document.createElement("td");
                
                var btnAbrir = document.createElement("button");
                btnAbrir.textContent = "Abrir";
                btnAbrir.onclick = function() {
                  ir_recurso(recurso.id);
                }; 
                tdAcciones.appendChild(btnAbrir);

                var btnX = document.createElement("button");
                btnX.textContent = "X";
                btnX.onclick = function() { 
                    eliminar_recurso(recurso.id);
                    var fila_borra = this.parentNode.parentNode;
                    fila_borra.parentNode.removeChild(fila_borra); 
                    
                };
                tdAcciones.appendChild(btnX);

                fila.appendChild(tdAcciones);

                cuerpoTabla.appendChild(fila);

            }
        }
    });

}

function limpiarTablasRecurso() {
    document.getElementById("cuerpo-tabla-reservas").innerHTML = "";
    document.getElementById("cuerpo-tabla-resenas").innerHTML = "";
}

function ir_recurso(id) {
    id_recurso_actual = id;

    categoria2();
    ubicacion2();

    cambiarSeccion("menu-recurso");

    document.getElementById("numserie").value = "";
    document.getElementById("estado2").value = "0";

    if (id != null) {
        rest.get(conToken("/api/recursos/" + id), function(estado, recurso) {
            if (estado == 200) {

                var categoria = 1;                           // termómetros
                if (recurso.modelo == 3) { categoria = 2; }  // estetoscopios
                if (recurso.modelo == 4) { categoria = 3; }  // desfibriladores
                
                modelo2(categoria, recurso.modelo);   

                setTimeout(function() {
                    document.getElementById("categoria2").value = categoria;
                    document.getElementById("modelo2").value = recurso.modelo;
                    document.getElementById("ubicacion2").value = recurso.ubicacion;
                    document.getElementById("numserie").value = recurso.numero_serie;
                    document.getElementById("estado2").value = recurso.estado;
                    reservas(id);
                    resenas(id);
                }, 200);
            }
        });
    } else {
        modelo2(1);
        limpiarTablasRecurso();
    }
}


function guardarRecurso() {
    var recurso = {
        modelo: document.getElementById("modelo2").value,
        ubicacion: document.getElementById("ubicacion2").value,
        numero_serie: document.getElementById("numserie").value,
        estado: document.getElementById("estado2").value
    };
    if (document.getElementById("numserie").value.trim() === "") {
        alert("Cuidado: debes indicar el número de serie");
        return;
    }
    if (id_recurso_actual == null) {
        rest.post(conToken("/api/recursos"), recurso, function(estado) {
            if (estado == 201) {
                alert("Recurso creado, volvemos al menu de recursos");
                var modelo_id = document.getElementById("modelo2").value;
                var num_serie = document.getElementById("numserie").value; // Importante: .value

                var nombreCat = "";
                var nombreMod = "";

                if(modelo_id == 1) { nombreCat = "TERMÓMETRO"; nombreMod = "MNX-4"; }
                if(modelo_id == 2) { nombreCat = "TERMÓMETRO"; nombreMod = "MNX-5"; }
                if(modelo_id == 3) { nombreCat = "ESTETOSCOPIO"; nombreMod = "AST-8"; }
                if(modelo_id == 4) { nombreCat = "DESFIBRILADOR"; nombreMod = "PEC-9"; }


                var mensajeTexto = "SE HA CREADO UN NUEVO RECURSO " + nombreCat + 
                       " MODELO " + nombreMod + 
                       " CON CÓDIGO " + num_serie;

                ws.send(JSON.stringify({
                    operacion: "aviso_recurso",
                    texto: mensajeTexto,
                    origen: nombre_gestor, 
                    fecha: new Date().toLocaleString()
                }));
                buscar();
                cambiarSeccion("menu-principal");
                
            } else {
                alert("Error al crear recurso");
            }
            });
    } else {
        rest.put(conToken("/api/recursos/" + id_recurso_actual), recurso, function(estado) {
            if (estado == 200) {
                alert("Recurso actualizado, volvemos al menu de recursos");
                buscar();  
                cambiarSeccion("menu-principal");
            } else {
                alert("Error al guardar el recurso");
            }
        });
    }
}


function reservas(id_recurso_actual) {
    rest.get(conToken("/api/recursos/" + id_recurso_actual + "/reservas"), function(estado, respuesta) {
        if (estado != 200) {
            alert("Error cargando reservas");
            return;
        }

        var cuerpoTabla = document.getElementById("cuerpo-tabla-reservas");
        cuerpoTabla.innerHTML = "";

        respuesta.forEach(function(reserva) {
            rest.get(conToken("/api/sanitarios/" + reserva.sanitario), function(est, san) {
                if (est != 200) return;

                let fila = document.createElement("tr");

                let fInicio;
                if (reserva.fecha_inicio) {
                    fInicio = new Date(reserva.fecha_inicio);
                } else {
                    fInicio = null;
                }

                let fFin;
                if (reserva.fecha_fin) {
                    fFin = new Date(reserva.fecha_fin);
                } else {
                    fFin = null;
                }

                let tdSanitario = document.createElement("td");
                tdSanitario.textContent = san.nombre + " " + san.apellido;
                
                let tdHoras = document.createElement("td");
                tdHoras.textContent = reserva.horas_estimadas;

                let tdPeticion = document.createElement("td");
                if (reserva.fecha_peticion) {
                    tdPeticion.textContent = new Date(reserva.fecha_peticion).toLocaleString();
                } else {
                    tdPeticion.textContent = "";
                }

                let tdInicio = document.createElement("td");
                if (reserva.fecha_inicio) {
                    tdInicio.textContent = new Date(reserva.fecha_inicio).toLocaleString();
                } else {
                    tdInicio.textContent = "";
                }

                let tdFin = document.createElement("td");
                if (reserva.fecha_fin) {
                    tdFin.textContent = new Date(reserva.fecha_fin).toLocaleString();
                } else {
                    tdFin.textContent = "";
                }

                fila.appendChild(tdSanitario);
                fila.appendChild(tdHoras);
                fila.appendChild(tdPeticion);
                fila.appendChild(tdInicio);
                fila.appendChild(tdFin);

                // Lógica de Colores de la Fila 
                let ahora = obtenerAhora();

                if (fFin) {
                    fila.style.backgroundColor = "white";
                    fila.style.color = "black";
                } 
                else if (!fInicio) {
                    fila.style.backgroundColor = "#28a745"; 
                    fila.style.color = "white";
                } 
                else {
                    // ESTÁ EN USO (Tiene inicio pero no fin)
                    // Calculamos la diferencia en horas entre "ahora" e "inicio"
                    let diferenciaMilisegundos = ahora - fInicio;
                    let horasTranscurridas = diferenciaMilisegundos / (1000 * 60 * 60);

                    let estimado = parseFloat(reserva.horas_estimadas);

                    if (horasTranscurridas <= estimado) {
                        fila.style.backgroundColor = "#007bff";
                        fila.style.color = "white";
                    } else {
                        fila.style.backgroundColor = "#dc3545";
                        fila.style.color = "white";
                    }
                }

                cuerpoTabla.appendChild(fila);
            
            });
        });
    });
}


function resenas(id_recurso_actual) {

    rest.get(conToken("/api/recursos/" + id_recurso_actual + "/resenyas"), function(estado, respuesta) {
        if (estado != 200) {
            alert("Error cargando la lista de reseñas para ese recurso");
            return;
        }

        var cuerpoTabla = document.getElementById("cuerpo-tabla-resenas");
        cuerpoTabla.innerHTML = "";

        for (let i = 0; i < respuesta.length; i++) {
            let resena = respuesta[i];

            rest.get(conToken("/api/sanitarios/" + resena.sanitario), function(est, san) {
                let fila = document.createElement("tr");

                let tdFecha = document.createElement("td");
                if (resena.fecha) {
                    tdFecha.textContent = new Date(resena.fecha).toLocaleString();
                } else {
                    tdFecha.textContent = "";
                }
                fila.appendChild(tdFecha);

                let tdSanitario = document.createElement("td");
                tdSanitario.textContent = san.nombre + " " + san.apellido;
                fila.appendChild(tdSanitario);

                let tdValor = document.createElement("td");
                tdValor.textContent = resena.valor;
                fila.appendChild(tdValor);

                let tdComentario = document.createElement("td");
                tdComentario.textContent = resena.descripcion;
                fila.appendChild(tdComentario);

                cuerpoTabla.appendChild(fila);
            });
        }
    });
}

function volver() {

    document.getElementById("cuerpo-tabla-reservas").innerHTML = "";
    document.getElementById("cuerpo-tabla-resenas").innerHTML = "";

    id_recurso_actual = null;

    cambiarSeccion("menu-principal");
}

function eliminar_recurso(id) {
    rest.delete(conToken("/api/recursos/" + id), function (estado, respuesta) { 
        if (estado == 200) {
           console.log("Se ha borrado el recurso")
        } else {
            alert("No se ha podido borrar el recurso");
            return;
        }
    });
}
