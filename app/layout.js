export const metadata = {
  title: 'Exito - App de Santi',
  description: 'Control de hábitos y nutrición',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}