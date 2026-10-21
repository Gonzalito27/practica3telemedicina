var jwt = require("jwt-simple");
var clave = "ClaveCifrar";
var express = require("express"); 
var app = express(); 

// 1. Importar el cliente de Supabase
const { createClient } = require('@supabase/supabase-js');

// 2. Configurar con tu URL y tu Public Key (anon key) de Supabase
const supabaseUrl = 'https://bfyhmsmcvgidhpyxuayn.supabase.co'; // <--- Pon aquí tu URL de Supabase
const supabaseKey = 'sb_publishable_V8eWYhfsqnewkFe8gQkdVQ_4Dhv9jVx';       // <--- Pon aquí tu Anon Key
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json()); 
app.use("/appCliente", express.static("cliente_rest"));  

// --- LOGIN ---
app.post("/api/gestores/login", async function (req, res) { 
    try {
        const { data: gestores, error } = await supabase
            .from('gestores')
            .select('*')
            .eq('login', req.body.login)
            .eq('password', req.body.password);

        if (error) {
            console.log("Error al realizar la select", error);
            return res.status(500).json("Error al realizar la consulta");
        }

        if (gestores && gestores.length === 1) {
             var contenido = {
                usuario: gestores[0].id,
                expira: Date.now() + 60 * 60 * 1000
            };
            var token = jwt.encode(contenido, clave);
            res.status(200).json({ id: gestores[0].id, token: token});
        } else {
            res.status(403).json("Ese usuario no existe");
        }
    } catch (err) {
        console.log("Excepción en login:", err);
        res.status(500).json("Error al realizar la consulta");
    }
});

// --- CREAR GESTOR ---
app.post("/api/gestores", async function (req, res) {
    try {
        const { data: resultados, error: errBuscar } = await supabase
            .from('gestores')
            .select('*')
            .eq('login', req.body.login);

        if (errBuscar) {
            console.log("Error al consultar gestor:", errBuscar);
            return res.status(500).json("Error al realizar la consulta");
        }

        if (resultados && resultados.length > 0) {
            return res.status(400).json("Ese usuario ya esta creado");
        } else {
            const { data: resultadoInsert, error: errInsert } = await supabase
                .from('gestores')
                .insert([{
                    nombre: req.body.nombre,
                    ape: req.body.ape,
                    login: req.body.login,
                    password: req.body.password
                }])
                .select();

            if (errInsert) {
                console.log("Error al insertar gestor:", errInsert);
                return res.status(500).json("Error al crear el gestor");
            } else {
                var nuevoId = resultadoInsert && resultadoInsert.length > 0 ? resultadoInsert[0].id : "";
                res.status(201).json("usuario creado con id " + nuevoId);
            }
        }
    } catch (err) {
        console.log("Excepción creando gestor:", err);
        res.status(500).json("Error al crear el gestor");
    }
});

// --- MIDDLEWARE DE TOKEN ---
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

    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) { 
        res.status(301).json("El formato del token no es adecuado");
        return;
    }

    if (contenidoToken.expira < Date.now()) {
        res.status(301).json("El token ha expirado"); 
        return;
    }

    next();
});

// --- UBICACIONES ---
app.get("/api/ubicaciones", async function (req, res) {
    const { data: ubicacion, error } = await supabase.from('ubicacion').select('*');
    if (error) {
        console.log("Error al realizar la select", error);
        return res.status(500).json("Error al realizar la consulta");
    }
    console.log("Se encontraron las siguientes ubicaciones");
    res.status(200).json(ubicacion);
});

// --- CATEGORÍAS ---
app.get("/api/categorias", async function (req, res) {
    const { data: categoria, error } = await supabase.from('categoria').select('*');
    if (error) {
        console.log("Error al realizar la select", error);
        return res.status(500).json("Error al realizar la consulta");
    }
    console.log("Se encontraron las siguientes categorias");
    res.status(200).json(categoria);
});

// --- MODELOS ---
app.get("/api/modelos", async function (req, res) {
    const { data: modelos, error } = await supabase.from('modelos').select('*');
    if (error) {
        console.log("Error al realizar la select", error);
        return res.status(500).json("Error al realizar la consulta");
    }
    console.log("Se encontraron los siguientes modelos");
    res.status(200).json(modelos);
});

// --- ACTUALIZAR GESTOR ---
app.put("/api/gestores/:id", async function (req, res) { 
    var id = req.params.id; 

    const { data: filas, error: errBuscar } = await supabase
        .from('gestores')
        .select('*')
        .eq('id', id);

    if (errBuscar || !filas || filas.length == 0) {
        return res.status(404).json("Ese gestor no existe");
    }

    var gestorActual = filas[0];

    var nombre = req.body.nombre != null && req.body.nombre !== "" ? req.body.nombre : gestorActual.nombre;
    var ape = req.body.ape != null && req.body.ape !== "" ? req.body.ape : gestorActual.ape;
    var login = req.body.login != null && req.body.login !== "" ? req.body.login : gestorActual.login;
    var password = req.body.password != null && req.body.password !== "" ? req.body.password : gestorActual.password;

    const { data: repetidos } = await supabase
        .from('gestores')
        .select('*')
        .eq('login', login)
        .neq('id', id);

    if (repetidos && repetidos.length > 0) {
        return res.status(400).json("Ese login ya esta en uso");
    }

    const { data: resultadoUpdate, error: errUpdate } = await supabase
        .from('gestores')
        .update({ nombre: nombre, ape: ape, login: login, password: password })
        .eq('id', id)
        .select();

    if (errUpdate) {
        console.log("Error al actualizar gestor:", errUpdate);
        return res.status(500).json("Error al actualizar el gestor");
    }

    res.status(200).json("Gestor actualizado correctamente");
});

// --- OBTENER GESTOR POR ID ---
app.get("/api/gestores/:id", async function (req, res) {
    var id = req.params.id; 
    const { data: resultados, error } = await supabase
        .from('gestores')
        .select('*')
        .eq('id', id);

    if (error || !resultados || resultados.length == 0) {
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

// --- OBTENER SANITARIO POR ID ---
app.get("/api/sanitarios/:id", async function (req, res) {
    var id = req.params.id; 
    const { data: resultados, error } = await supabase
        .from('sanitarios')
        .select('*')
        .eq('id', id);

    if (error || !resultados || resultados.length == 0) {
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

// --- OBTENER RECURSOS ---
app.get("/api/recursos", async function (req, res) {
    var idCategoria = req.query.categoria || "";
    var idModelo = req.query.modelo || "";
    var idUbicacion = req.query.ubicacion || "";
    var idEstado = req.query.estado || "";

    try {
        if (idCategoria !== "") {
            const { data: modelosEncontrados, error: errModelos } = await supabase
                .from('modelos')
                .select('id')
                .eq('categoria', idCategoria);

            if (errModelos || !modelosEncontrados || modelosEncontrados.length == 0) {
                return res.status(200).json([]);
            }

            var idsModelos = modelosEncontrados.map(m => m.id);

            let query = supabase.from('recurso').select('*').in('modelo', idsModelos);
            if (idModelo !== "") { query = query.eq('modelo', idModelo); }
            if (idUbicacion !== "") { query = query.eq('ubicacion', idUbicacion); }
            if (idEstado !== "") { query = query.eq('estado', idEstado); }

            const { data: resultados, error } = await query;
            if (error) {
                console.log("Error al consultar recursos:", error);
                return res.status(500).json("Error al realizar la consulta");
            }
            res.status(200).json(resultados);

        } else {
            let query = supabase.from('recurso').select('*');
            if (idModelo !== "") { query = query.eq('modelo', idModelo); }
            if (idUbicacion !== "") { query = query.eq('ubicacion', idUbicacion); }
            if (idEstado !== "") { query = query.eq('estado', idEstado); }

            const { data: resultados, error } = await query;
            if (error) {
                console.log("Error al consultar recursos:", error);
                return res.status(500).json("Error al realizar la consulta");
            }
            res.status(200).json(resultados);
        }
    } catch (err) {
        console.log("Excepción en recursos:", err);
        res.status(500).json("Error al realizar la consulta");
    }
});

// --- OBTENER RECURSO POR ID ---
app.get("/api/recursos/:id", async function (req, res) {
    var id = req.params.id;
    const { data: resultados, error } = await supabase
        .from('recurso')
        .select('*')
        .eq('id', id);

    if (error || !resultados || resultados.length === 0) {
        return res.status(404).json("Ese recurso con el id " + id + " no existe");
    }
    res.status(200).json(resultados[0]);
});

// --- CREAR RECURSO ---
app.post("/api/recursos", async function (req, res) {
    const { data: resultados } = await supabase
        .from('recurso')
        .select('*')
        .eq('numero_serie', req.body.numero_serie);

    if (resultados && resultados.length > 0) {
        return res.status(400).json("Ese recurso ya esta creado");
    } else {
        const { data: resultadoInsert, error: errInsert } = await supabase
            .from('recurso')
            .insert([{
                modelo: req.body.modelo,
                ubicacion: req.body.ubicacion,
                numero_serie: req.body.numero_serie,
                estado: req.body.estado
            }])
            .select();

        if (errInsert) {
            console.log("Error al insertar recurso:", errInsert);
            return res.status(500).json("Error al crear el recurso");
        } else {
            var nuevoId = resultadoInsert && resultadoInsert.length > 0 ? resultadoInsert[0].id : "";
            res.status(201).json("recurso creado con id " + nuevoId);
        }
    }
});

// --- ACTUALIZAR RECURSO ---
app.put("/api/recursos/:id", async function (req, res) { 
    var id = req.params.id; 

    const { data: filas } = await supabase.from('recurso').select('*').eq('id', id);
    if (!filas || filas.length == 0) {
        return res.status(404).json("Este recurso no existe");
    }

    var recursoActual = filas[0];
    var modelo = req.body.modelo != null ? req.body.modelo : recursoActual.modelo;
    var ubicacion = req.body.ubicacion != null ? req.body.ubicacion : recursoActual.ubicacion;
    var numero_serie = req.body.numero_serie != null ? req.body.numero_serie : recursoActual.numero_serie;
    var estado = req.body.estado != null ? req.body.estado : recursoActual.estado;

    const { error: errUpdate } = await supabase
        .from('recurso')
        .update({ modelo: modelo, ubicacion: ubicacion, numero_serie: numero_serie, estado: estado })
        .eq('id', id);

    if (errUpdate) {
        console.log("Error al actualizar recurso:", errUpdate);
        return res.status(500).json("Error al modificar el recurso");
    }

    res.status(200).json("Este recurso con el siguiente id " + id + " se modifico");
});

// --- BORRAR RECURSO ---
app.delete("/api/recursos/:id", async function (req, res) { 
    var id = req.params.id; 
    
    const { data: filas } = await supabase.from('recurso').select('*').eq('id', id);
    if (!filas || filas.length == 0) {
        return res.status(404).json("No se ha encontrado el recurso a borrar");
    }

    const { error: errBorrado } = await supabase.from('recurso').delete().eq('id', id);
    if (errBorrado) {
        console.log("Error al borrar recurso:", errBorrado);
        return res.status(500).json("Error al borrar el recurso");
    }

    res.status(200).json("Recurso borrado con id " + id);
});

// --- RESERVAS DE UN RECURSO ---
app.get("/api/recursos/:id/reservas", async function (req, res) {
    var id = req.params.id;
    const { data: reservas, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('recurso', id);

    if (error) {
        console.log("Error al realizar la select:", error);
        return res.status(500).json("Error al realizar la consulta");
    }
    res.status(200).json(reservas);
});

// --- RESEÑAS DE UN RECURSO ---
app.get("/api/recursos/:id/resenyas", async function (req, res) {
    var id = req.params.id;
    const { data: resenyas, error } = await supabase
        .from('resenas')
        .select('*')
        .eq('recurso', id);

    if (error) {
        console.log("Error al realizar la select:", error);
        return res.status(500).json("Error al realizar la consulta");
    }
    res.status(200).json(resenyas);
});

app.listen(3000, function(){
    console.log("Servidor escuchando en puerto 3000 (Supabase / PostgreSQL)");
});
