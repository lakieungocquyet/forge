import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, BrowserRouter } from 'react-router'
import App from './views/App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  	<React.StrictMode>
      	<BrowserRouter>
        	<App/>
      	</BrowserRouter>
  	</React.StrictMode>,
)
