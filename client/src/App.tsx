
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Pay from "./pages/Pay";
import Success from "./pages/Success";
import Fail from "./pages/Fail";
import Privacy from "./pages/Privacy";
import Agreement from "./pages/Agreement";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pay" element={<Pay />} />
        <Route path="/success" element={<Success />} />
        <Route path="/fail" element={<Fail />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/agreement" element={<Agreement />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
