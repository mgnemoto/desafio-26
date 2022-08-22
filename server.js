/*============================[Modulos]============================*/
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
const LocalStrategy = Strategy;
import exphbs from "express-handlebars";
import path from "path";
import mongoose from "mongoose";
import User from "./src/models/User.js";
import bcrypt from "bcrypt"

mongoose
  .connect("mongodb://localhost:27017/passport-local")
  .then(() => console.log("DB is connected"))
  .catch((err) => console.log(err));
const app = express();

/*----------- Session -----------*/
app.use(
  session({
    secret: "pepe",
    resave: false,
    saveUninitialized: false,
  })
);

/*----------- Motor de plantillas -----------*/
app.set("views", path.join(path.dirname(""), "./src/views"));
app.engine(
  ".hbs",
  exphbs.engine({
    defaultLayout: "main",
    layoutsDir: path.join(app.get("views"), "layouts"),
    extname: ".hbs",
  })
);
app.set("view engine", ".hbs");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/*==========================[Passport]===========================*/

app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy((username,password,done)=>{
  User.findOne({username}, (err, user)=>{
    if(err) console.log(err)
    if(!user) return done(null, false)
    bcrypt.compare(password, user.password, (err, isMatch)=>{
      if(err) console.log (err);
      if(isMatch) return done(null, user);
      return done(null,false)
    })
  })
}))

passport.serializeUser((user,done)=>{
  done(null, user.id);
})

passport.deserializeUser( async (id,done)=>{
  const user= await User.findById(id);
  done(null,user)
})

/*============================[Rutas]============================*/

function auth(req,res,next){
  if(req.isAuthenticated()){
    next()
  }else{
    res.render("login-error")
  }
  
}

app.get("/", (req, res) => {
  if(req.user){
    res.redirect("/datos")
  }else{
    res.redirect("/login")
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/login-error", (req,res)=>
{res.render("login-error")})

app.post("/login", passport.authenticate("local", {failureRedirect: '/login-error'}), (req, res) => {
  res.redirect("/datos")
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { username, password, direccion } = req.body;
  User.findOne({username}, async (err,user)=>{
    if (err) console.log(err);
    if(user) res.render("register-error");
    if(!user) {
      const hashedPassword= await bcrypt.hash(password, 10);
      const newUser = new User({
        username,
        password:hashedPassword,
        direccion,
      });
      await newUser.save();
    }
    res.redirect("/login")
  })
});

app.get("/datos", async (req, res) => {
  if(req.user){
    const datosUsuario = await User.findById(req.user._id).lean()
    res.render("datos", {datos:datosUsuario})
  }
  else{res.redirect("/login")}
});

app.get("/privada", auth, (req,res)=>{
  res.send("Estoy en una ruta privada")
})

app.get("/logout", (req, res, next) => {
  req.logout(function(err){
    if(err){
      return next(err)
    }
    res.redirect("/")
  })
});

/*============================[Servidor]============================*/
const PORT = 8080;
const server = app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
server.on("error", (error) => {
  console.error(`Error en el servidor ${error}`);
});
