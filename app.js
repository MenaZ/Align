// Seting up the libraries:
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const session= require('express-session');
const bcrypt= require('bcrypt-nodejs');


// Setting up the link to the database.
const sequelize= new Sequelize('align_app', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: true
	}
})

app.use('/', bodyParser());

app.set('views', 'views');
app.set('view engine', 'pug');
app.use(express.static("public"));

// Setting up the tables
var User = sequelize.define('user', {
	firstname: Sequelize.STRING,
	lastname: Sequelize.STRING,
	email: Sequelize.STRING,
	age: Sequelize.INTEGER,
	gender: Sequelize.STRING,
	password: Sequelize.STRING,
	aboutme: Sequelize.STRING
});

var Event= sequelize.define('events', {
	title: Sequelize.STRING,
	description: Sequelize.STRING,
	date: Sequelize.STRING
})

var Comment= sequelize.define('comment', {
	body: Sequelize.STRING
})

// Setting up the model by linking the tables to each other
Event.belongsTo(User);
User.hasMany(Event);
User.hasMany(Comment);
Comment.belongsTo(User);
Event.hasMany(Comment);
Comment.belongsTo(Event);

sequelize.sync({force: false}) //Change false to true to wipe clean the whole database.

// Creates session when user logs in
app.use(session({
	secret: `#{process.env.SECRET_SESSION}`,
	resave: true,
	saveUninitialized: false
}));
// go to the register page
app.get('/register', (req, res) => {
    res.render('register', {
    });
});
app.post('/register', (req, res) => {
	var user = request.session.user;
	User.sync()
	.then(() => {

	// check email im DB
		User.findOne({
			where: {
					email: req.body.email
			}
		})
		.then(() => {
			if(user !== null && req.body.email=== user.email) {
        		res.redirect('/?message=' + encodeURIComponent("Email already exists!"));
				return;
			}
			else{
				bcrypt.hash(req.body.password, null, null, (err, hash) =>{
					if (err) {
						throw err
					}
					User.sync()
					.then(() => {
						User.create({
							firstname: req.body.firstname,
							lastname: req.body.lastname,
							email: req.body.email,
							age: req.body.age,
							gender: req.body.gender,
							password: hash,
							aboutme: req.body.aboutme
						})
					})
					.then(() =>{
						res.redirect('views/login')
					})
					.then().catch(error=> console.log(error))
				})
			}
		})
		.then().catch(error => console.log(error))
	})
	.then().catch(error => console.log(error))
})




var server = app.listen(3000, function () {
    console.log('Example app listening on port: ' + server.address().port);
});