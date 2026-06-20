import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import GoogleSignInButton from "@modules/account/components/google-sign-in-button"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  returnTo?: string | null
}

const Login = ({ setCurrentView, returnTo }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="w-full flex flex-col items-stretch"
      data-testid="login-page"
    >
      <h1 className="text-[26px] font-bold text-ink leading-tight tracking-tight text-center mb-1">
        Welcome back
      </h1>
      <p className="text-center text-xs text-ink/50 mb-6">
        Sign in to access an enhanced shopping experience.
      </p>

      {/* Google Sign-In */}
      <GoogleSignInButton className="mb-2" returnTo={returnTo} />

      {/* Divider */}
      <div className="w-full flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-line/80" />
        <span className="text-ink/40 text-[10px] font-bold uppercase tracking-wider">or sign in with email</span>
        <div className="flex-1 h-px bg-line/80" />
      </div>

      <form className="w-full flex flex-col" action={formAction}>
        {returnTo && (
          <input type="hidden" name="return_to" value={returnTo} />
        )}
        <div className="flex flex-col w-full gap-y-3">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton 
          data-testid="sign-in-button" 
          className="w-full mt-6 h-11 rounded-full bg-primary text-primary-fg text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          Sign in
        </SubmitButton>
        <div className="w-full text-center mt-4">
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.FORGOT)}
            className="text-xs font-semibold text-ink/65 hover:text-ink transition-colors hover:underline"
            data-testid="forgot-password-link"
          >
            Forgot password?
          </button>
        </div>
      </form>
      <span className="text-center text-ink/60 text-xs mt-6">
        Not a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="font-bold text-ink hover:underline"
          data-testid="register-button"
        >
          Join us
        </button>
      </span>
    </div>
  )
}

export default Login

