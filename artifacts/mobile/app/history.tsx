import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageBackground,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function HistoryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"timeline" | "sedes">("timeline");

  const timelineData = [
    {
      year: "1811",
      title: "Gesta Independentista y Primera Junta",
      subtitle: "El nacimiento del Congreso",
      description: "14 y 15 de mayo: Se inicia la historia de la Cámara con el nacimiento del Paraguay independiente tras segregarse de la metrópoli española. Del 17 al 20 de junio se reúne la primera Junta General (Magna Asamblea) con más de 300 individuos y 6 diputados, inaugurando la modalidad de Congreso como órgano supremo.",
    },
    {
      year: "1813",
      title: "Primer Congreso General y Reglamento",
      subtitle: "Soberanía y República",
      description: "30 de setiembre: Se reúne el Congreso General de la Provincia con unos 1.100 congresistas en el Templo de Nuestra Señora de la Merced, bajo la presidencia de Pedro Juan Cavallero. 12 de octubre: Se aprueba por aclamación el Reglamento de Gobierno de 17 artículos, estableciendo el nombre de 'República del Paraguay'.",
    },
    {
      year: "1814",
      title: "Reducción de Diputados",
      subtitle: "Reforma congresal",
      description: "3 y 4 de octubre: El Congreso General reduce el número de diputados a 250 elegidos popularmente y dispone que los congresos se celebren anualmente en mayo a partir de 1816.",
    },
    {
      year: "1816",
      title: "Dictadura Perpetua",
      subtitle: "Disolución temporal",
      description: "1 de junio: Reunidos en la Catedral de la Asunción, se declara a José Gaspar Rodríguez de Francia como Dictador Perpetuo vitalicio y se establece que los futuros congresos se convocarán solo cuando él lo considere necesario, disolviéndose hasta 1841.",
    },
    {
      year: "1841",
      title: "El Consulado Bicéfalo",
      subtitle: "Reanudación del Congreso",
      description: "12 de marzo: Se reúne el Congreso General en el antiguo Templo de San Francisco, presidido por Carlos A. López, estableciendo el Consulado bicéfalo junto a Mariano R. Alonso.",
    },
    {
      year: "1842",
      title: "Ratificación de la Independencia",
      subtitle: "Pabellón y Sello Nacional",
      description: "25 al 27 de noviembre: Un Congreso General Extraordinario de 400 diputados en el Templo de la Encarnación ratifica la Independencia Nacional y establece el pabellón y sellos de la República.",
    },
    {
      year: "1844",
      title: "Ley de Administración Política",
      subtitle: "Expansión del poder público",
      description: "13 de marzo: El Congreso General de 300 diputados sanciona la Ley que establece la Administración Política de la República (promulgada el 16 de marzo), configurando un Congreso Nacional unicameral de 200 diputados y eligiendo a Carlos A. López como Presidente por 10 años.",
    },
    {
      year: "1849",
      title: "Reunión Ordinaria",
      subtitle: "Actividad legislativa",
      description: "30 de mayo: Se lleva a cabo la Reunión Ordinaria del Congreso Nacional.",
    },
    {
      year: "1854",
      title: "Reelección abreviada",
      subtitle: "Mandato presidencial",
      description: "14 de marzo: Durante el Congreso Nacional, Carlos A. López acepta la reelección por un período abreviado de 3 años.",
    },
    {
      year: "1856",
      title: "Creación de la Vicepresidencia",
      subtitle: "Reforma institucional",
      description: "3 de noviembre: Se sanciona la reforma a la ley de 1844 reduciendo el Congreso a 100 diputados y creando el cargo de Vicepresidente mediante pliego reservado.",
    },
    {
      year: "1857",
      title: "Reelección de Carlos A. López",
      subtitle: "Instalación en el Cabildo",
      description: "14 de marzo: El Congreso Nacional reelige a Carlos A. López por otro período de 10 años, instalándose el Congreso de Diputados en el segundo piso del Cabildo.",
    },
    {
      year: "1862",
      title: "Gobierno de Francisco Solano López",
      subtitle: "Transición de mandos",
      description: "10 de setiembre: Tras la muerte de Carlos A. López, se instala el Gobierno Provisorio de Francisco Solano López mediante pliego reservado. 16 de octubre: El Congreso Nacional proclama a Francisco Solano López como Presidente de la República por 10 años.",
    },
    {
      year: "1865",
      title: "Congreso Extraordinario",
      subtitle: "Contexto internacional",
      description: "15 de febrero: Se celebra un Congreso Extraordinario para considerar la grave situación internacional.",
    },
    {
      year: "1864 - 1870",
      title: "Guerra Guazú",
      subtitle: "Epopeya Nacional",
      description: "11 de noviembre de 1864 al 1 de marzo de 1870: Ocurre la Epopeya Nacional o Guerra Guazú (Guerra de la Triple Alianza) que enfrentó a Paraguay con Argentina, Brasil y Uruguay. 31 de marzo de 1869: Una Asamblea General con 335 ciudadanos realiza un petitorio a los Aliados solicitando un gobierno provisorio.",
    },
    {
      year: "1870",
      title: "La Era de la Bicameralidad",
      subtitle: "Constitución de 1870",
      description: "03 de julio: Se convocan comicios para elegir 42 diputados constituyentes. 15 de agosto: Se da inicio a la Convención Nacional Constituyente. 24 de noviembre: Se sanciona la Constitución de 1870 (promulgada el 25 de noviembre), instalándose por primera vez la bicameralidad del Congreso con 26 miembros en la Cámara de Diputados.",
    },
    {
      year: "1871",
      title: "Disolución y Nuevo Congreso",
      subtitle: "Reorganización parlamentaria",
      description: "15 de octubre: Cirilo Rivarola disuelve las cámaras del Congreso y convoca a un nuevo cuerpo legislativo. 8 de diciembre: Se constituye el nuevo Congreso.",
    },
    {
      year: "1908",
      title: "Revolución de Julio",
      subtitle: "Disolución congresal",
      description: "4 de julio: Se disuelve el Congreso tras la Revolución de julio; a finales de año se convocan elecciones resultando electos 28 diputados.",
    },
    {
      year: "1911",
      title: "Intervención de Albino Jara",
      subtitle: "Inestabilidad política",
      description: "1 de junio: El coronel Albino Jara disuelve el Congreso. 5 de julio: El Congreso se vuelve a reunir tras la dimisión y destierro de Albino Jara.",
    },
    {
      year: "1912",
      title: "Reconstitución Legislativa",
      subtitle: "Nuevas sesiones",
      description: "15 al 20 de mayo: Se disuelven las cámaras legislativas y se llama a elecciones para reconstituir el Congreso. 1 de agosto: Se reinauguran las sesiones de las nuevas cámaras del Congreso.",
    },
    {
      year: "1916",
      title: "Ampliación de Diputados",
      subtitle: "Reforma de Ley Electoral",
      description: "30 de noviembre: Se amplía la composición de la Cámara de Diputados a 40 miembros mediante una reforma de la Ley Electoral.",
    },
    {
      year: "1922 - 1923",
      title: "Guerra Civil y Reanudación",
      subtitle: "Crisis institucional",
      description: "1922: Se produce una disolución de las cámaras legislativas a consecuencia de una guerra civil. 1923: Ocurre la disolución automática del Senado y se convocan elecciones legislativas para el 30 de setiembre para completar las cámaras.",
    },
    {
      year: "1932 - 1935",
      title: "Guerra del Chaco",
      subtitle: "Conflicto bélico",
      description: "1932 a 1935: Se desarrolla la Guerra del Chaco contra Bolivia.",
    },
    {
      year: "1936",
      title: "Revolución Febrerista",
      subtitle: "Derogación constitucional",
      description: "17 de febrero: Se disuelve el Congreso y se deroga la Constitución de 1870 (el Congreso se reconstituye en 1938). 10 de octubre de 1938: Queda constituido el nuevo Congreso Nacional tras elecciones.",
    },
    {
      year: "1940",
      title: "Constitución de 1940",
      subtitle: "Cámara Unicameral",
      description: "16 de febrero: El Congreso Legislativo se disuelve para revisar la Constitución de 1870. 18 de febrero: El Poder Ejecutivo asume plenos poderes por decreto y establece tregua política. 10 de julio: Entra en vigencia la nueva Constitución Nacional (sometida a plebiscito el 4 de agosto y jurada el 15 de agosto), estableciendo una Cámara de Representantes unicameral basada en la población.",
    },
    {
      year: "1948",
      title: "Deliberaciones de Representantes",
      subtitle: "Reinicio parlamentario",
      description: "13 de abril: Tras 8 años, la Cámara de Representantes inicia sus deliberaciones con 40 titulares y 14 suplentes.",
    },
    {
      year: "1959",
      title: "Disolución por Malestar Político",
      subtitle: "Tensión institucional",
      description: "29 de mayo: Bajo la presidencia de Alfredo Stroessner, se disuelve la Cámara de Representantes por malestar político.",
    },
    {
      year: "1960",
      title: "Reinicio con 60 Miembros",
      subtitle: "Modificación electoral",
      description: "13 de marzo: Tras modificar el estatuto electoral y realizar elecciones, se reinician las sesiones de la Cámara de Representantes con 60 miembros.",
    },
    {
      year: "1967",
      title: "Constitución de 1967",
      subtitle: "Restablecimiento bicameral",
      description: "25 de agosto: Se sanciona y promulga la Constitución Nacional de 1967, restableciendo la bicameralidad con una Cámara de Diputados de al menos 60 titulares y 36 suplentes. 25 de marzo de 1977: Se aprueba la enmienda del artículo 173 de la Constitución sobre la reelección presidencial.",
    },
    {
      year: "1987",
      title: "Ampliación a 72 Miembros",
      subtitle: "Ley electoral",
      description: "14 de octubre: Se modifica la ley electoral para fijar la Cámara de Diputados en 72 miembros titulares para el período 1988-1993.",
    },
    {
      year: "1989",
      title: "Caída del Régimen",
      subtitle: "Nuevo Congreso Nacional",
      description: "2 y 3 de febrero: Un golpe de estado militar derroca a Alfredo Stroessner y disuelve el Congreso Nacional. 10 de mayo: Asume un nuevo Congreso Nacional compuesto por 72 diputados titulares tras los comicios del 1 de mayo.",
    },
    {
      year: "1992",
      title: "Constitución Nacional Vigente",
      subtitle: "Democracia contemporánea",
      description: "20 de junio: Se sanciona y promulga la Constitución Nacional de 1992, estableciendo el sistema bicameral actual con 80 diputados titulares e igual número de suplentes elegidos por departamentos.",
    },
    {
      year: "2003",
      title: "Sede Actual",
      subtitle: "Palacio Legislativo",
      description: "Junio de 2003: Se inaugura la moderna sede actual del Congreso Nacional donada por el gobierno de Taiwán, donde un bloque está destinado a la Cámara de Diputados.",
    },
    {
      year: "2011",
      title: "Enmienda Constitucional N° 1",
      subtitle: "Voto en el extranjero",
      description: "17 de octubre: Se aprueba la Enmienda Constitucional N° 1 para habilitar el voto de los paraguayos residentes en el extranjero.",
    },
  ];

  const sedesData = [
    {
      period: "1811",
      title: "Templos e Iglesias de Asunción",
      location: "Recintos religiosos coloniales",
      description: "Al inicio de la independencia, las sesiones se realizaban en templos debido a su capacidad, destacando la Catedral, San Francisco, La Merced y La Encarnación.",
      image: require("../assets/templos.png"),
    },
    {
      period: "1857 - 1990s",
      title: "El Cabildo de Asunción",
      location: "Centro Histórico",
      description: "Tras importantes remodelaciones, el segundo piso del histórico Cabildo albergó al Congreso Nacional de Diputados durante gran parte de la era moderna.",
      image: require("../assets/cabildo.png"),
    },
    {
      period: "1997 - 2003",
      title: "Ex Casa de la Cultura",
      location: "Antiguo Colegio Jesuítico",
      description: "Antiguo edificio de 1596 que sirvió como sede legislativa tras ser restaurado. Fue declarado Bien Cultural y Patrimonio de la Nación por Ley N° 1719.",
      image: require("../assets/excasacultura.png"),
    },
    {
      period: "2003 - Presente",
      title: "Palacio Legislativo Actual",
      location: "Avenida República",
      description: "Moderno complejo inaugurado en junio de 2003 gracias a una donación, donde uno de los bloques está enteramente destinado a la Cámara de Diputados.",
      image: require("../assets/palacioactual.png"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header con paddingTop en 52 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Historia y Legado</Text>
          <Text style={styles.headerSubtitle}>Poder Legislativo del Paraguay</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Pestañas de Navegación Estilo Pastilla */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "timeline" && styles.activeTab]}
          onPress={() => setActiveTab("timeline")}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={activeTab === "timeline" ? "#FFFFFF" : "#64748B"} 
          />
          <Text style={[styles.tabText, activeTab === "timeline" && styles.activeTabText]}>
            Línea de Tiempo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "sedes" && styles.activeTab]}
          onPress={() => setActiveTab("sedes")}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="business-outline" 
            size={18} 
            color={activeTab === "sedes" ? "#FFFFFF" : "#64748B"} 
          />
          <Text style={[styles.tabText, activeTab === "sedes" && styles.activeTabText]}>
            Sedes Históricas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === "timeline" ? (
          <View style={styles.sectionWrapper}>
            <Text style={styles.introText}>
              Evolución institucional, constitucional y parlamentaria que marcó el rumbo de la Cámara de Diputados.
            </Text>
            
            <View style={styles.timelineWrapper}>
              {timelineData.map((item, index) => (
                <View key={index} style={styles.timelineRow}>
                  {/* Columna de la fecha y línea conectora */}
                  <View style={styles.timelineLeftCol}>
                    <View style={styles.yearBadge}>
                      <Text style={styles.yearText}>{item.year}</Text>
                    </View>
                    {index !== timelineData.length - 1 && <View style={styles.connectorLine} />}
                  </View>

                  {/* Tarjeta de Contenido */}
                  <View style={styles.timelineCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.sectionWrapper}>
            <Text style={styles.introText}>
              Los distintos espacios físicos y arquitectónicos que albergaron la soberanía popular a través de los años.
            </Text>

            <View style={styles.sedesGrid}>
              {sedesData.map((sede, index) => (
                <ImageBackground 
                  key={index} 
                  source={sede.image} 
                  style={styles.sedeCardBackground}
                  imageStyle={styles.sedeImageStyle}
                >
                  <View style={styles.cardOverlay}>
                    <View style={styles.sedeTopRow}>
                      <View style={styles.sedeIconContainer}>
                        <Ionicons name="location" size={16} color="#FFFFFF" />
                      </View>
                      <Text style={styles.sedePeriod}>{sede.period}</Text>
                    </View>
                    <Text style={styles.sedeTitle}>{sede.title}</Text>
                    <Text style={styles.sedeLocationText}>{sede.location}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.sedeDesc}>{sede.description}</Text>
                  </View>
                </ImageBackground>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    // Ajustado exactamente a 52 para Android (y 26 para iOS)
    paddingTop: Platform.OS === "android" ? 52 : 26,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  tabText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  sectionWrapper: {
    gap: 16,
  },
  introText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  timelineWrapper: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineLeftCol: {
    alignItems: "center",
    width: 64,
  },
  yearBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  yearText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 6,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginLeft: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDescription: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
  },
  sedesGrid: {
    gap: 16,
  },
  sedeCardBackground: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sedeImageStyle: {
    borderRadius: 16,
  },
  cardOverlay: {
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    padding: 18,
    width: "100%",
  },
  sedeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sedeIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sedePeriod: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sedeTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  sedeLocationText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 10,
  },
  sedeDesc: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 19,
  },
});