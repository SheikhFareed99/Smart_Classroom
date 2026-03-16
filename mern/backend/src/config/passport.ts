import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { Strategy as localStrategy } from "passport-local";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/users"; 


dotenv.config();

// local (emal, password) strategy
// NOTE THAT PASSPORT DOES NOT HANDLE LOCAL REGISTRATION
// THIS ONLY CHCEKS IF THE USER EXISTS AND IF THE PASSWORD IS CORRECT, REGISTRATION IS HANDLED IN THE CONTROLLER
passport.use(
  new localStrategy(
    {usernameField: "email"}, // specify that we are using email instead of username
    async (email, password, done) => {
      try{
        const user = await User.findOne({email});

        if (!user){
          return done(null, false, {message: "Incorrect email or password"});
        }

        // we have found the user, but no password field, this means that user registered with google
        if (!user.password){
          return done(null, false, {message: "This email is registered with google oauth, please login with google"});
        }

        //validating user password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch){
          return done(null, false, {message: "Incorrect email or password"});
        }

        return done(null, user);
      } catch (err){
        return done(err);

      }
    }
  )
)


// google oauth login strategy, this does not handle registration as of yet
// only checks if user's google id is corret (passport n email etc)
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/auth/google/callback"
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done
    ) => {
      try {
        
        // the user logging into database stuff goes here

        let user = await User.findOne({ googleId: profile.id });

        if (user){
          console.log("this user already exists, logging in: ", user.email)
          return done(null, user);
        }

        // now we check if a user with the same email exists, (previously logged in with email n password)
        // we link them to their google account
        user = await User.findOne({ email: profile.emails?.[0]?.value });

        if (user){

          user.googleId = profile.id;
          await user.save();
          console.log("linked google account to existing user: ", user.email)
          return done(null, user);

        }

        // if no user exists, then we create a new one
        const new_user = await User.create({
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          googleId: profile.id,
          enrolledCourses: [],
          teachingCourses: []
         });

        console.log("created new user: ", new_user.email)
        return done(null, new_user);

      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

// THE FOLLOWING 2 FUNCTIONS WOULD BE MODIFIED WHEN WE USE A DATABSE TO STORE USERS (HAS BEEN MODIFIED)

// serialize is used to decide what to store in the session
passport.serializeUser((user: any, done) => {
    done(null, user);
});

// deserialize the whole profile for now
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});