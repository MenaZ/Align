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

app.set('views', './');
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

var Event= sequelize.define('event', {
	title: Sequelize.STRING,
	description: Sequelize.STRING,
	location: Sequelize.STRING,
	date: Sequelize.STRING
})

var Comment = sequelize.define('comment', {
	body: Sequelize.STRING
})

var Announce = sequelize.define('announce')

// Setting up the model by linking the tables to each other
Event.belongsTo(User);
User.hasMany(Event);
User.hasMany(Comment);
Comment.belongsTo(User);
Event.hasMany(Comment);
Comment.belongsTo(Event);
User.hasMany(Announce);
Announce.belongsTo(User);
Event.hasMany(Announce);
Announce.belongsTo(Event);


sequelize.sync({force: false}) //Change false to true to wipe clean the whole database.

// Creates session when user logs in
app.use(session({
	secret: `#{process.env.SECRET_SESSION}`,
	resave: true,
	saveUninitialized: false
}));

// Goes to the index page, which is the homepage of the blog app
app.get('/', function (req,res){
	res.render('public/views/index', {
		// You can also use req.session.message so message won't show in the browser
		message: req.query.message,
		user: req.session.user
	});
});

// go to the register page
app.get('/register', (req, res) => {
    res.render('public/views/register')
});

app.post('/register', bodyParser.urlencoded({extended:true}), (req, res) => {
	// check email im DB
		User.findOne({
			where: {
					email: req.body.email
			}
		})
		.then((user) => {
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
						res.redirect('public/views/login')
					})
					.then().catch(error=> console.log(error))
				})
			}
		})
	.then().catch(error => console.log(error))
});

app.get('/login', (req, res)=> {
	res.render('public/views/login')
})

app.post('/login', (req, res) => {
	if(req.body.email.length ===0) {
		res.redirect('/?message=' + encodeURIComponent("Invalid email"));
		return;
	}
	if(req.body.password.length ===0) {
		res.redirect('/?message=' + encodeURIComponent("Invalid password"));
		return;
	}

	User.findOne({
		where: {
			email:req.body.email
		}
	})	.then((user) => {
		bcrypt.compare(req.body.password, user.password, (err, data)=>{
			if (err) {
					throw err;
			} else {
				if(user !== null && data === true) {
					req.session.user = user;
					res.redirect('/profile');
				} else {
					res.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
				}
			}
		});
	}), (error)=> {
		res.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
};
});

app.get('/profile', (req, res)=> {
    var user = req.session.user;
    if (user === undefined) {
        res.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
    } else {
        res.render('public/views/profile', {
            user: user
        });
    }
});

app.get('/event', (req,res) =>{
	var user = req.session.user;
	if (user === undefined) {
        res.redirect('/?message=' + encodeURIComponent("Please log in to view and post events!"));
    }
    else {
	    Event.sync()
	    	.then(function(){
	    		User.findAll()
	    			.then((users)=>{
	    				Event.findAll({include: [{
			    				model: Comment,
			    				as: 'comments'
			    			}]
			    			// ,
			    			// order: '"updatedAt" DESC'
			    		})
			    		.then((events)=>{
			    			res.render('public/views/event', {
			    				events: events,
			    				users: users
			    			})
			    		})
	    			})
	    	})
	    	.then().catch(error=> console.log(error))
	}
});

app.post('/event', (req,res) => {
	if(req.body.message.length===0 || req.body.title.length===0) {
		res.end('You forgot your title or message!');
		return
	}
	else {
		Event.sync()
			.then()
				User.findOne({
					where: {
						email: req.session.user.email
					}
				}).then((user)=>{
					return Event.create({
						title: req.body.title,
						description: req.body.description,
						location: req.body.location,
						date: req.body.date,
						userId: user.id
					})
				}).then().catch(error=> console.log(error))
			.then(function() {
				res.redirect('/event');
			})
			.then().catch(error => console.log(error));
	}
})

app.post('/comment', (req,res)=>{
	if(req.body.comment.length===0) {
		res.end('You forgot your comment!')
	}
	else {
		Comment.sync()
			.then()
				User.findOne({
					where: {
						email: req.session.user.email
					}
				}).then(user => {
					return Comment.create({
						body: req.body.comment,
						eventId: req.body.eventId,
						userId: user.id
					})
				}).then(function(){
					res.redirect('/post')
				}).then().catch(error => console.log(error));
	}
})

app.get('/logout', (req, res)=> {
    req.session.destroy(function(error) {
        if(error) {
            throw error;
        }
        res.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
    })
});

var server = app.listen(3000, function() {
  console.log('http//:localhost:' + server.address().port);
});