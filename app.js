


// Import core modules
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

// Router Objects
var indexRouter = require("./routes/index");
var booksRouter = require("./routes/books");
var authorsRouter = require("./routes/authors");

// Import MongoDB and Configuration modules
var mongoose = require("mongoose");
var configs = require("./configs/globals");

// HBS Helper Methods
var hbs = require("hbs");

// Import passport and session modules
var passport = require("passport");
var session = require("express-session");

// Import user model
var User = require("./models/user");

// Import Google OAuth Strategy
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Express App Object
var app = express();

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// Express Configuration
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Configure session
app.use(
  session({
    secret: "s2021pr0j3ctTracker",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Link passport to the user model
passport.use(User.createStrategy());

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: configs.Authentication.Google.ClientId,
      clientSecret: configs.Authentication.Google.ClientSecret,
      callbackURL: configs.Authentication.Google.CallbackURL, // Fixed typo
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google Profile:", profile);
        let user = await User.findOne({ oauthId: profile.id });

        if (user) {
          return done(null, user);
        } else {
          const newUser = new User({
            username: profile.displayName,
            oauthId: profile.id,
            oauthProvider: "Google",
            created: Date.now(),
          });

          user = await newUser.save();
          return done(null, user);
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        return done(error, null);
      }
    }
  )
);

// Set passport to write/read user data to/from session object
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Routing Configuration
app.use("/", indexRouter);
app.use("/books", booksRouter);
app.use("/authors", authorsRouter);

// MongoDB connection setup with async/await
const connectDB = async () => {
  try {
    await mongoose.connect(configs.ConnectionStrings.MongoDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB successfully!");

    // Start Express server after MongoDB connection
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (error) {
    console.log(`Error while connecting to MongoDB: ${error}`);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

// Initiate MongoDB connection
connectDB();

// HBS Helpers
hbs.registerHelper("createOptionElement", (currentValue, selectedValue) => {
  const selectedProperty =
    selectedValue && currentValue == selectedValue.toString() ? "selected" : "";
  return new hbs.SafeString(
    `<option ${selectedProperty}>${currentValue}</option>` // Fixed syntax error
  );
});

hbs.registerHelper("toShortDate", (longDateValue) => {
  if (!longDateValue) return "";
  return new hbs.SafeString(new Date(longDateValue).toLocaleDateString("en-CA"));
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;

