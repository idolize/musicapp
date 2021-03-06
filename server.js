var express = require('express')
, routes = require('./routes')
, http = require('http')
, path = require('path')
, passport = require('passport')
, FacebookStrategy = require('passport-facebook').Strategy
, mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/collabdb');
var db = mongoose.connection;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Facebook profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new FacebookStrategy({
		clientID: '488102791244387',
		clientSecret: 'fac3c20b3a436766c866c69ee3128275',
		callbackURL: 'http://localhost:3000/auth/facebook/callback'
	},
	function(accessToken, refreshToken, profile, done) {
		// To keep the example simple, the user's Facebook profile is returned to
		// represent the logged-in user.  In a typical application, you would want
		// to associate the Facebook account with a user record in your database,
		// and return that user instead.
		return done(null, profile);
	}
));

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser('secretval'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session());
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/project', function(req, res){
	ProjectModel.findOne({'_id': req.query.id}, {}, {}, function(err, data){
		TrackProjectModel.find({'projectId': data._id}, {}, {}, function(err, data2){
			//console.log(data2);
			var track_data = [];
			console.log(data2);
			for (var i = 0 ; i < data2.length ; i++) {
   				//console.log(data2[i].trackTitle);
			}
		})
		res.render('project', {
			title: 'Project',
			req: req,
			user: req.user,
			project_data: data,
		});
		//console.log(data);
	})
});
app.get('/users', routes.users);
app.get('/project_list', function(req, res){
	ProjectModel.find({}, {}, {}, function(err, data){
		res.render('project_list', {
			title: 'All Projects',
			user: req.user,
			list: data
		});
	});
});
app.get('/account', ensureAuthenticated, routes.account);

app.get('/new_project', ensureAuthenticated, routes.new_project);
app.post('/new_project', ensureAuthenticated, function(req, res){
 	var params = {
 		"title": req.param("title"),
 		"userId": req.user.id,
 		"description": req.param('description')
 	}
 	addProject(params);
 	res.redirect('/');
 });

app.get('/myprojects', ensureAuthenticated, function(req, res){
	ProjectModel.find({'userId': req.user.id}, {}, {}, function(err, data){
		res.render('myprojects', {
			title: 'My Projects',
			user: req.user,
			list: data
		});
	})
})


// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
	passport.authenticate('facebook'),
	function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
});

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback', 
	passport.authenticate('facebook', { failureRedirect: '/' }),
	function(req, res) {
		res.redirect('/');
});

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

app.get('/fileupload', ensureAuthenticated, routes.fileupload);
app.post('/upload', ensureAuthenticated, addTrack, routes.upload);

// app.get('/test', function(req, res, next) {
// 	res.render('test', {
// 		title: 'test',
// 		testContent: 'asdfasdf',
// 		list: [1,2,3]
// 	});
// });
// app.get('/test2', function(req, res, next) {
// 	TrackModel.find({'i'}, {}, {}, function(err, data) {
// 		res.render('test', {
// 			title: 'test',
// 			testContent: 'asdfasdf',
// 			list: data
// 		});
// 	})
// });

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/');
}

function addTrack(req, res, next) {
	var params = {
		"title": req.param("title"),
		"userId": req.user.id,
		"description": req.param('description'),
		"fileLocation": "",
		"type": req.param('type'),
		"extension": getExtension(req.files.audioFile.name)
	}
	
	var newtrack = new TrackModel(params);
	newtrack.save(function(err, newTrack){
		if (err){
			console.error(err.text);
		} else {
			console.log("New track named '%s' is created", newTrack.title);

			// if there is no projectId parameter in the GET request, then exit
			// If there is one, add this track to the project associated with the projectId
			if (!req.param('projectId')){
				return next();
			}
			//console.log(req.param('projectId'));

			ProjectModel.findOne({'_id': req.param('projectId')}, '', function(err, data)
			{
				if (err) return handleError(err);
				paramsTP = {
					'trackId': newTrack._id,
					'trackTitle': newTrack.title,
					'projectId': data._id,
					'projectTitle': data.title,
					'trackType': newTrack.type,
					'trackExtension': newTrack.extension,
				}
				var newTrackProject = new TrackProjectModel(paramsTP);
				newTrackProject.save(function(err, dataTP)
				{
					if (err){
						console.error(err, + " | problem in newTrack.save");
					} else {
						console.log("New TrackProject betweem track '%s' and project '%s' is created", dataTP.trackTitle, dataTP.projectTitle);
					}
					//console.log("trackid: %s, trackTitle: %s, projectid: %s, projectName: %s", newTrack._id, newTrack.title, data._id, data.title);
				});
			});
			return next();
		}
	});

}

function addProject(params){
	var newproject = new ProjectModel(params);
	newproject.save(function(err, newTrack){
		if (err){
			console.error(err.text);
		} else {
			console.log("New project named '%s' is created", newTrack.title);
		}

	});
}

function getTracksByUserId(userId){
	TrackModel.find({'userId': 1}, '', function(err, tracks){
		if (err) return handleError(err);
		console.log(tracks);
	});
}

function getExtension(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
}

function initDatabase(){
	
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function callback () {});

	//var Track = initUserTrackDatabase();
	//var Project = initUserProjectDatabase();

	// var returnObject;
	// Track.find({'creatorId': 1}, 'title description', function(err, track){
	// 	if (err) return handleError(err);
	// 	console.log(track);
	// });
	//console.log("Title: %s \nDescription: %s", track.title, track.description);
	//return returnObject;
}

function initUserTrackDatabase(){
	var trackSchema;
	trackSchema = new mongoose.Schema({
		title:  String,
		userId: Number,
		description:   String,
		fileLocation: String,
		type: String,
		extension: String,
		date: { type: Date, default: Date.now },
	});
	// trackSchema.methods.getTitle = function(){
	// 	console.log("Track #" + this.creatorId + " has the Title " + this.title);
	// }

	var Track = mongoose.model('Track', trackSchema);
	return Track;
}

function initUserProjectDatabase(){
	var projectSchema;
	projectSchema = new mongoose.Schema({
		title:  String,
		userId: Number,
		description:   String,
		date: { type: Date, default: Date.now },
	});

	var Project = mongoose.model('Project', projectSchema);
	return Project;
}

function initTrackProjectDatabase(){
	var trackProjectSchema;
	trackProjectSchema = new mongoose.Schema({
		trackId: String,
		trackTitle:  String,
		projectId:   String,
		projectTitle: String,
		trackType: String,
		trackExtension: String,
	});

	var TrackProject = mongoose.model('TrackProject', trackProjectSchema);
	return TrackProject;
}


initDatabase();
var TrackModel = initUserTrackDatabase();
var ProjectModel = initUserProjectDatabase();
var TrackProjectModel = initTrackProjectDatabase()

//console.log(getExtension("waivers.log"));

// var params = {
// 	title: "Pumped Up Kicks",
// 	userId: 1,
// 	description: "A really long string...",
// 	fileLocation: "",
// }

//addTrack(params);
//getTracksByUserId(1);
//console.log(tracks);
// TrackModel.find({'userId': 1}, 'title description', function(err, track){
// 	if (err) return handleError(err);
// 	console.log(track);
// });


