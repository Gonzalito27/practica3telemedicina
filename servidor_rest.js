var jwt = require("jwt-simple");
var clave = "ClaveCifrar";
var conexion = require("./conexion_mysql.js")
var express = require("express"); 
var app = express(); 


app.use(express.json()); 

app.use("/appCliente", express.static("cliente_rest"));  

app.post("/api/gestores/login", function (req, res) { 
    var sql = "SELECT * FROM gestores WHERE login = '" + req.body.login + "' AND password = '" + req.body.password + "'";
    
    conexion.query(sql, function (err, gestores) {
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            if (gestores.length === 1) {
                 var contenido = {
                    usuario: gestores[0].id,
                    expira: Date.now() + 60 * 60 * 1000
                };
                var token = jwt.encode(contenido, clave);
                res.status(200).json({ id: gestores[0].id, token: token});
            } else {
                res.status(403).json("Ese usuario no existe");
            }
        }
    });
});

app.post("/api/gestores", function (req, res) {
    var sqlBuscar = "SELECT * FROM gestores WHERE login = '" + req.body.login + "'";

    conexion.query(sqlBuscar, function (err, resultados) {
        if (err) {
            console.log("Error al consultar gestor:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            
            if (resultados.length > 0) {
                res.status(400).json("Ese usuario ya esta creado");
            } else {
                var sqlInsert = "INSERT INTO gestores (nombre, ape, login, password) VALUES ('" 
                    + req.body.nombre + "', '" 
                    + req.body.ape + "', '" 
                    + req.body.login + "', '" 
                    + req.body.password + "')";

                conexion.query(sqlInsert, function (errInsert, resultado) {
                    if (errInsert) {
                        console.log("Error al insertar gestor:", errInsert);
                        res.status(500).json("Error al crear el gestor");
                    } else {
                        res.status(201).json("usuario creado con id " + resultado.insertId);
                    }
                });
            }
        }
    });
});

app.use("/api", function (req, res, next) {
    var token = req.query.token; 
    if (!token) { 
        res.status(301).json("No se ha encontrado token");
        return;
    }

    try { 
        var contenidoToken = jwt.decode(token, clave); 
    } catch (error) {
        res.status(301).json("El token es incorrecto");
        return;
    }
    //console.log("El contenido del token es:", contenidoToken);

    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) { 
        res.status(301).json("El formato del token no es adecuado")
        return;
    }

    if (contenidoToken.expira < Date.now()) {
        res.status(301).json("El token ha expirado"); 
         return;
    }

    next();
});


app.get("/api/ubicaciones", function (req, res) {
    var sql = "SELECT * FROM ubicacion";
    conexion.query(sql, function(err,ubicacion){
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Se encontraron las siguientes ubicaciones")
            res.status(200).json(ubicacion); 
  
        }
    });
    
});

app.get("/api/categorias", function (req, res) {
    var sql = "SELECT * FROM categoria";
    conexion.query(sql, function(err,categoria){
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Se encontraron las siguientes categorias")
            res.status(200).json(categoria); 
  
        }
    });
    
});

app.get("/api/modelos", function (req, res) {
   var sql = "SELECT * FROM modelos";
    conexion.query(sql, function(err,modelos){
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Se encontraron los siguientes modelos")
            res.status(200).json(modelos); 
  
        }
    });
    
});

app.put("/api/gestores/:id", function (req, res) { 
    var id = req.params.id; 

    var sqlBuscar = "SELECT * FROM gestores WHERE id = " + id;

    conexion.query(sqlBuscar, function (err, filas) {
        if (err) {
            console.log("Error al consultar gestor:", err);
            return res.status(500).json("Error al actualizar el gestor");
        }

        if (filas.length == 0) {
            return res.status(404).json("Ese gestor no existe");
        }

        var gestorActual = filas[0];

        var nombre = gestorActual.nombre;
        if (req.body.nombre != null && req.body.nombre !== "") { nombre = req.body.nombre; }

        var ape = gestorActual.ape;
        if (req.body.ape != null && req.body.ape !== "") { ape = req.body.ape; }

        var login = gestorActual.login;
        if (req.body.login != null && req.body.login !== "") { login = req.body.login; }

        var password = gestorActual.password;
        if (req.body.password != null && req.body.password !== "") { password = req.body.password; }

        var sqlLogin = "SELECT * FROM gestores WHERE login = '" + login + "' AND id != " + id;

        conexion.query(sqlLogin, function (errLogin, repetidos) {
            if (errLogin) {
                console.log("Error al comprobar login:", errLogin);
                return res.status(500).json("Error al actualizar el gestor");
            }

            if (repetidos.length > 0) {
                return res.status(400).json("Ese login ya esta en uso");
            }

            var sqlUpdate = "UPDATE gestores SET nombre = '" + nombre + 
                            "', ape = '" + ape + 
                            "', login = '" + login + 
                            "', password = '" + password + 
                            "' WHERE id = " + id;

            conexion.query(sqlUpdate, function (errUpdate, resultado) {
                if (errUpdate) {
                    console.log("Error al actualizar gestor:", errUpdate);
                    return res.status(500).json("Error al actualizar el gestor");
                } else if (resultado.changedRows === 0) {
                    console.log("No se modifico ningún dato del gestor");
                    return res.status(400).json("No se ha realizado ningún cambio en el gestor");
                }
                res.status(200).json("Gestor actualizado correctamente");
            });
        });
    });
});


app.get("/api/gestores/:id", function (req, res) {
    var id = req.params.id; 
    var sql = "SELECT * FROM gestores WHERE id = " + id;

    conexion.query(sql, function (err, resultados) {
        if (err) {
            console.log("Error al consultar gestor:", err);
            return res.status(500).json("Error al realizar la consulta");
        }

        if (resultados.length == 0) {
            return res.status(404).json("Ese gestor no existe");
        }

        var gestor_encontrado = resultados[0];

        var lista_devolver = {
            nombre: gestor_encontrado.nombre,
            apellido: gestor_encontrado.ape,
            login: gestor_encontrado.login
        };

        res.status(200).json(lista_devolver);
    });
});


app.get("/api/sanitarios/:id", function (req, res) {
    var id = req.params.id; 
    var sql = "SELECT * FROM sanitarios WHERE id = " + id;

    conexion.query(sql, function (err, resultados) {
        if (err) {
            console.log("Error al consultar sanitario:", err);
            return res.status(500).json("Error al realizar la consulta");
        }

        if (resultados.length == 0) {
            return res.status(404).json("Ese sanitario no existe");
        }

        var sanitario_encontrado = resultados[0];

        var lista_devolver = {
            nombre: sanitario_encontrado.nombre,
            apellido: sanitario_encontrado.ape,
            login: sanitario_encontrado.login
        };

        res.status(200).json(lista_devolver);
    });
});

app.get("/api/recursos", function (req, res) {
    var idCategoria = req.query.categoria || "";
    var idModelo = req.query.modelo || "";
    var idUbicacion = req.query.ubicacion || "";
    var idEstado = req.query.estado || "";

    if (idCategoria !== "") {
        
        var sqlModelos = "SELECT id FROM modelos WHERE categoria = " + idCategoria;

        conexion.query(sqlModelos, function (err, modelosEncontrados) {
            if (err) {
                console.log("Error al consultar modelos:", err);
                return res.status(500).json("Error al realizar la consulta");
            }

            if (modelosEncontrados.length == 0) {
                return res.status(200).json([]);
            }

            var idsModelos = [];
            for (var i = 0; i < modelosEncontrados.length; i++) {
                idsModelos.push(modelosEncontrados[i].id);
            }

            var condicionModelos = " AND modelo IN (";
            for (var k = 0; k < idsModelos.length; k++) {
                condicionModelos += idsModelos[k];
                if (k < idsModelos.length - 1) {
                    condicionModelos += ",";
                }
            }
            condicionModelos += ")";

            var sql = "SELECT * FROM recurso WHERE 1=1" + condicionModelos;

            if (idModelo !== "") { sql += " AND modelo = " + idModelo; }
            if (idUbicacion !== "") { sql += " AND ubicacion = " + idUbicacion; }
            if (idEstado !== "") { sql += " AND estado = " + idEstado; }

            conexion.query(sql, function (err, resultados) {
                if (err) {
                    console.log("Error al consultar recursos:", err);
                    return res.status(500).json("Error al realizar la consulta");
                }
                res.status(200).json(resultados);
            });
        });

    } else {
        var sql = "SELECT * FROM recurso WHERE 1=1";

        if (idModelo !== "") { sql += " AND modelo = " + idModelo; }
        if (idUbicacion !== "") { sql += " AND ubicacion = " + idUbicacion; }
        if (idEstado !== "") { sql += " AND estado = " + idEstado; }

        conexion.query(sql, function (err, resultados) {
            if (err) {
                console.log("Error al consultar recursos:", err);
                return res.status(500).json("Error al realizar la consulta");
            }
            res.status(200).json(resultados);
        });
    }
});

app.get("/api/recursos/:id", function (req, res) {
    var id = req.params.id;
    var sql = "SELECT * FROM recurso WHERE id = " + id;

    conexion.query(sql, function (err, resultados) {
        if (err) {
            console.log("Error al realizar la select:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            if (resultados.length === 1) {
                // Si lo encuentra, devuelve el primer (y único) elemento del array
                res.status(200).json(resultados[0]);
            } else {
                // Si el array viene vacío, es que ese id no existe
                res.status(404).json("Ese recurso con el id " + id + " no existe");
            }
        }
    });
});

app.post("/api/recursos", function (req, res) {
    var sqlBuscar = "SELECT * FROM recurso WHERE numero_serie = '" + req.body.numero_serie + "'";

    conexion.query(sqlBuscar, function (err, resultados) {
        if (err) {
            console.log("Error al consultar recurso:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            if (resultados.length > 0) {
                res.status(400).json("Ese recurso ya esta creado");
            } else {
                // 3. Paso B: No existe, por lo que procedemos a insertar
                var sqlInsert = "INSERT INTO recurso (modelo , ubicacion , numero_serie , estado) VALUES ('" 
                    + req.body.modelo + "', '" 
                    + req.body.ubicacion + "', '" 
                    + req.body.numero_serie + "', '" 
                    + req.body.estado + "')";

                conexion.query(sqlInsert, function (errInsert, resultado) {
                    if (errInsert) {
                        console.log("Error al insertar recurso:", errInsert);
                        res.status(500).json("Error al crear el recurso");
                    } else {
                        res.status(201).json("recurso creado con id " + resultado.insertId);
                    }
                });
            }
        }
    });
});

app.put("/api/recursos/:id", function (req, res) { 
    var id = req.params.id; 

    var sqlBuscar = "SELECT * FROM recurso WHERE id = " + id;

    conexion.query(sqlBuscar, function (err, filas) {
        if (err) {
            console.log("Error al consultar recurso:", err);
            return res.status(500).json("Error al modificar el recurso");
        }

        if (filas.length == 0) {
            return res.status(404).json("Este recurso no existe");
        }

        var recursoActual = filas[0];

        var modelo = recursoActual.modelo;
        if (req.body.modelo != null) {
            modelo = req.body.modelo;
        }

        var ubicacion = recursoActual.ubicacion;
        if (req.body.ubicacion != null) {
            ubicacion = req.body.ubicacion;
        }

        var numero_serie = recursoActual.numero_serie;
        if (req.body.numero_serie != null) {
            numero_serie = req.body.numero_serie;
        }

        var estado = recursoActual.estado;
        if (req.body.estado != null) {
            estado = req.body.estado;
        }

        var sqlUpdate = "UPDATE recurso SET modelo = '" + modelo + 
                        "', ubicacion = '" + ubicacion + 
                        "', numero_serie = '" + numero_serie + 
                        "', estado = '" + estado + 
                        "' WHERE id = " + id;

        conexion.query(sqlUpdate, function (errUpdate, resultado) {
            if (errUpdate) {
                console.log("Error al actualizar recurso:", errUpdate);
                return res.status(500).json("Error al modificar el recurso");
            } else if (resultado.changedRows === 0) {
                console.log("No se modifco ningún dato del recurso");
                return res.status(400).json("No se ha realizado ningún cambio en el recurso");
            }

            res.status(200).json("Este recurso con el siguiente id " + id + " se modifico");
        });
    });
});

app.delete("/api/recursos/:id", function (req, res) { 
    var id = req.params.id; 
    
    var sqlBuscar = "SELECT * FROM recurso WHERE id = " + id;

    conexion.query(sqlBuscar, function (err, filas) {
        if (err) {
            console.log("Error al buscar recurso:", err);
            return res.status(500).json("Error al borrar el recurso");
        }

        if (filas.length == 0) {
            return res.status(404).json("No se ha encontrado el recurso a borrar");
        }

        var sqlBorrar = "DELETE FROM recurso WHERE id = " + id; //Esto es para que se borre tambien el reserva o resena que tenga asociado y no haya clave ajena
        
        conexion.query(sqlBorrar, function (errBorrado) {
            if (errBorrado) {
                console.log("Error al borrar recurso:", errBorrado);
                return res.status(500).json("Error al borrar el recurso");
            }

            res.status(200).json("Recurso borrado con id " + id);
        });
    });
});

// Obtener reserva por id 
app.get("/api/recursos/:id/reservas", function (req, res) {
    var id = req.params.id;
    var sql = "SELECT * FROM reservas WHERE recurso = " + id;

    conexion.query(sql, function (err, reservas) {
        if (err) {
            console.log("Error al realizar la select:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            // Si no encuentra reseñas, resenyas será un array vacío [], que es lo correcto
            res.status(200).json(reservas);
        }
    });
});

app.get("/api/recursos/:id/resenyas", function (req, res) {
    var id = req.params.id;
    var sql = "SELECT * FROM resenas WHERE recurso = " + id;

    conexion.query(sql, function (err, resenyas) {
        if (err) {
            console.log("Error al realizar la select:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            res.status(200).json(resenyas);
        }
    });
});



app.listen(3000, function(){
    console.log("Servidor escuchando en puerto 3000");
});

    
