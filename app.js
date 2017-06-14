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

var Event= sequelize.define('events', {
	title: Sequelize.STRING,
	description: Sequelize.STRING,
	location: Sequelize.STRING,
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

// Goes to the index page, which is the homepage of the blog app
app.get('/', function (req,res){
	res.render('public/views/index', {
		// You can also use req.session.message so message won't show in the browser
		message: req.query.message,
		user: req.session.user
	});
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
        res.redirect('/?message=' + encodeURIComponent("Please log in to view and post messages!"));
    }
    else {
	    Event.sync()
	    	.then(function(){
	    		User.findAll()
	    			.then((users)=>{
	    				Event.findAll({include: [{
			    				model: Comment,
			    				as: 'comments'
			    			}],
			    			order: '"updatedAt" DESC'
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