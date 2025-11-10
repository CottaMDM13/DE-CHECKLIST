// src/layouts/MainLayout.jsx
import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
  Container,
  Fade,
} from "@mui/material";

const routes = [
  { label: "Aluno", path: "/aluno" },
  { label: "Professor", path: "/professor" },
  { label: "Meus Relatórios", path: "/relatorios" },
];

function a11yProps(index) {
  return {
    id: `main-tab-${index}`,
    "aria-controls": `main-tabpanel-${index}`,
  };
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = React.useMemo(() => {
    const index = routes.findIndex((route) =>
      location.pathname.startsWith(route.path)
    );
    return index === -1 ? 0 : index;
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    navigate(routes[newValue].path);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Barra superior centralizada */}
      <AppBar
        position="static"
        color="primary"
        elevation={2}
        sx={{
          background:
            "linear-gradient(90deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            py: 1,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              letterSpacing: 0.5,
              textAlign: "center",
            }}
          >
            Painel de Análise
          </Typography>

          <Tabs
            value={currentTab}
            onChange={handleChange}
            textColor="inherit"
            indicatorColor="secondary"
            centered
            sx={{
              minHeight: 48,
              "& .MuiTabs-flexContainer": {
                justifyContent: "center",
              },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                minHeight: 48,
                fontSize: 15,
                mx: 1,
                transition:
                  "color 0.2s ease, transform 0.2s ease, opacity 0.2s ease",
                opacity: 0.85,
              },
              "& .MuiTab-root:hover": {
                opacity: 1,
                transform: "translateY(-1px)",
              },
              "& .MuiTab-root.Mui-selected": {
                fontWeight: 600,
                opacity: 1,
                transform: "translateY(-1px)",
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: 1.5,
              },
            }}
          >
            {routes.map((route, index) => (
              <Tab key={route.path} label={route.label} {...a11yProps(index)} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>

      {/* Área de conteúdo centralizada + animação de entrada */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          py: 3,
        }}
      >
        <Fade in key={location.pathname} timeout={300}>
          <Container
            maxWidth="md"
            sx={{
              // leve animação de “slide” pra cima junto com o fade
              "@keyframes fadeUp": {
                from: { opacity: 0, transform: "translateY(8px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
              animation: "fadeUp 0.3s ease-out",
            }}
          >
            <Outlet />
          </Container>
        </Fade>
      </Box>
    </Box>
  );
}
