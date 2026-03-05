import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import dotenv from "dotenv";



dotenv.config();

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

        return done(null, profile);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

// THE FOLLOWING 2 FUNCTIONS WOULD BE MODIFIED WHEN WE USE A DATABSE TO STORE USERS

// we serialize the whole profile for now
// serialize is used to decide what to store in the session
passport.serializeUser((user: any, done) => {
    done(null, user);
});

// deserialize the whole profile for now
passport.deserializeUser((user: any, done) => {
    done(null, user)
});