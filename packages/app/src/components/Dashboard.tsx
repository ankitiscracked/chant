interface DashboardProps {
  email: string;
  onLogout: () => void;
}

export function Dashboard({ email, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-green-800 mb-6">
          🎉 Login Successful! 🎉
        </h1>
        <p className="text-lg text-green-700 mb-6">
          Welcome to your dashboard! You have successfully logged in using voice
          commands.
        </p>
        <div className="bg-green-100 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-semibold text-green-800 mb-4">
            User Details:
          </h3>
          <div className="space-y-2 text-left">
            <p className="text-green-700">
              <strong>Email:</strong> {email}
            </p>
            <p className="text-green-700">
              <strong>Login Time:</strong> {new Date().toLocaleString()}
            </p>
            <p className="text-green-700">
              <strong>Status:</strong> ✅ Authenticated
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}