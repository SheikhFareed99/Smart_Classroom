import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { Strategy as localStrategy } from "passport-local";
import dotenv from "dotenv";
import User from "../models/users.model";
import {
  findUserByEmail,
  findUserByGoogleId,
  createGoogleUser,
  linkGoogleAccount,
  verifyPassword,
} from "../services/user.service";

dotenv.config();

// local (email, password) strategy
// NOTE THAT PASSPORT DOES NOT HANDLE LOCAL REGISTRATION
// THIS ONLY CHECKS IF THE USER EXISTS AND IF THE PASSWORD IS CORRECT, REGISTRATION IS HANDLED IN THE CONTROLLER
passport.use(
  new localStrategy(
    { usernameField: "email" }, // specify that we are using email instead of username
    async (email, password, done) => {
      try {
        const user = await findUserByEmail(email);

        if (!user) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        // we have found the user, but no password field, this means that user registered with google
        if (!user.password) {
          return done(null, false, { message: "This email is registered with google oauth, please login with google" });
        }

        // validating user password
        const isMatch = await verifyPassword(password, user.password);

        if (!isMatch) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
)


// google oauth login strategy
// handles login, account linking, and registration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/auth/google/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done
    ) => {
      try {
        // check if user already exists with this Google ID
        let user = await findUserByGoogleId(profile.id);

        if (user) {
          console.log("User already exists, logging in:", user.email);
          return done(null, user);
        }

        // check if a user with the same email exists (previously logged in with email/password)
        // link them to their google account
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await findUserByEmail(email);

          if (user) {
            user = await linkGoogleAccount(user, profile.id);
            return done(null, user);
          }
        }

        // if no user exists, create a new one
        const newUser = await createGoogleUser(profile);
        return done(null, newUser);

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