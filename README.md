# 🛰️ Xenonite Mission Control

**Advanced Satellite Tracking & Collision Threat Monitoring System**

_NASA Space Apps Challenge 2025 - Commercializing Low Earth Orbit Challenge_

---

## 🌟 Overview

Xenonite Mission Control is an interactive 3D web application that visualizes orbital debris, tracks active satellites, and provides real-time collision threat assessment. Built for the NASA Space Apps Challenge 2025, this prototype addresses the critical challenge of space debris monitoring and satellite safety.

### 🎯 Mission Statement

To transform debris risk into actionable business decisions for sustainable LEO commercialization, enabling satellite operators to make informed choices between maneuvering, mitigation, and monetization strategies in the circular space economy.

---

## 💼 Business Model Innovation

Xenonite transforms traditional "collision avoidance" into **commercial opportunity**:

- **🚀 Maneuver**: Calculate fuel costs and mission impact for collision avoidance
- **🤝 Mitigate**: Connect with debris removal services (Astroscale, ClearSpace, etc.)
- **💰 Monetize**: Enable end-of-life asset salvage in circular space economy

This three-action decision framework turns debris risk into **business intelligence** for sustainable LEO operations.

---

## ✨ Key Features

### 🛰️ **Real-Time 3D Visualization**

- **Interactive Earth Model** with realistic atmospheric effects
- **Live Satellite Tracking** using Two-Line Element (TLE) data
- **Orbital Debris Visualization** with threat level indicators
- **Orbital Trajectory Lines** showing satellite paths
- **Cinematic Camera System** with auto-follow capabilities

### 📊 **Collision Threat Scoring (CTS) + Business Intelligence**

- **Real-time Risk Assessment** for satellite-debris proximity
- **Color-coded Threat Levels** (Green/Yellow/Red)
- **Distance-based Calculations** with orbital mechanics
- **Three-Action Decision Framework**: Maneuver/Mitigate/Monetize
- **Cost-Benefit Analysis** for each response strategy
- **Historical Data Analysis** showing debris growth over time

### 🎮 **Interactive Controls**

- **TLE Input System** for custom satellite tracking
- **Time Acceleration** (1x to 10x speed)
- **Camera Controls** (zoom, rotate, follow)
- **Keyboard Shortcuts** for power users
- **Responsive Design** for all devices

### 📈 **Historical Mode**

- **Timeline Visualization** (1980-2025)
- **Debris Growth Animation** showing space pollution evolution
- **Educational Content** about orbital debris impact

---

## 🚀 Quick Start

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for TLE data updates
- No installation required!

### Running the Application

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/xenonite-mission-control.git
   cd xenonite-mission-control
   ```

2. **Open in browser:**

   ```bash
   # Option 1: Simple file opening
   open index.html

   # Option 2: Local server (recommended)
   python -m http.server 8000
   # Then visit: http://localhost:8000
   ```

3. **Start exploring:**
   - Watch the historical debris animation
   - Click "Skip Intro" to jump to live mode
   - Input TLE data to track specific satellites
   - Use camera controls to explore the 3D scene

---

## 🎮 User Guide

### **Getting Started**

1. **Historical Mode**: Experience the growth of orbital debris from 1980-2025
2. **Live Mode**: Switch to real-time satellite tracking and debris monitoring
3. **TLE Input**: Enter Two-Line Element data to track specific satellites
4. **Dashboard**: Monitor collision threats and satellite status

### **Controls**

#### **Mouse Controls**

| Action           | Effect                        |
| ---------------- | ----------------------------- |
| **Left Drag**    | Rotate 3D view                |
| **Scroll Wheel** | Zoom in/out                   |
| **Right Click**  | Context menu (future feature) |

#### **Keyboard Shortcuts**

| Key        | Action                  |
| ---------- | ----------------------- |
| **F**      | Toggle camera follow    |
| **H**      | Show help               |
| **T**      | Time acceleration (10x) |
| **N**      | Normal time (1x)        |
| **Space**  | Pause/Resume            |
| **Escape** | Close panels            |

#### **Camera Follow**

- **Auto-follow**: Camera smoothly tracks your satellite
- **Manual Control**: Drag to override auto-follow
- **Zoom Control**: Always user-controlled via scroll wheel

---

## 🏗️ Technical Architecture

### **Frontend Stack**

- **Three.js** - 3D graphics and WebGL rendering
- **Vanilla JavaScript** - No frameworks, pure performance
- **CSS3** - Modern styling with animations
- **HTML5** - Semantic markup and accessibility

### **Core Modules**

```
js/
├── app.js              # Application orchestrator
├── scene.js            # Three.js scene management
├── orbital.js          # SGP4 propagation
├── cts-engine.js       # Collision threat scoring
├── ui-controller.js    # Dashboard controls
├── data-loader.js      # TLE parsing
├── historical-mode.js  # Historical debris animation
├── historical-debris.js # Historical data management
└── logger.js           # Production logging system
```

### **Data Sources**

- **CelesTrak TLE Catalogs** - Sourced from USSPACECOM
- **NASA Visible Earth** - Blue Marble textures and imagery
- **COSMOS 2251 Debris Field** - ~2,000 tracked fragments
- **Real-time Updates** - Current orbital positions
- **Historical Archives** - Debris growth over decades

---

## 📊 Data & Performance

### **Real-time Capabilities**

- **~2,000 Debris Objects** (COSMOS 2251 field) rendered simultaneously
- **500 Active Satellites** (performance-optimized subset)
- **60 FPS** smooth 3D animations
- **10 FPS** debris position updates
- **2 FPS** active satellite updates
- **10 FPS** collision threat calculations

### **Optimization Features**

- **Efficient Rendering** - Only visible objects drawn
- **Update Throttling** - Prevents performance bottlenecks
- **Memory Management** - Automatic cleanup of unused objects
- **Responsive Design** - Adapts to different screen sizes

---

## 🎨 Visual Features

### **3D Earth Visualization**

- **High-resolution Earth texture** (Blue Marble 2K)
- **Multi-layer atmosphere** with realistic glow effects
- **Starfield background** for space immersion
- **Dynamic lighting** and shadows

### **Satellite & Debris Rendering**

- **Enhanced satellite sprites** with pulsing glow effects
- **Varied debris sizes** for visual distinction
- **Color-coded threat levels** (Green/Yellow/Red)
- **Orbital trajectory lines** with distance markers

### **User Interface**

- **Modern glass-morphism design**
- **Smooth animations** and transitions
- **Responsive layout** for all devices
- **Accessibility features** (keyboard navigation, screen reader support)

---

## 🔧 Development

### **Project Structure**

```
xenonite-mission-control/
├── index.html              # Main HTML file
├── css/                    # Modular stylesheets
│   ├── core.css           # Base styles
│   ├── dashboard.css      # Dashboard layout
│   ├── header.css         # Header styling
│   └── ...
├── js/                     # JavaScript modules
│   ├── app.js             # Main controller
│   ├── scene.js           # 3D scene management
│   └── ...
├── data/                   # TLE data files
│   ├── active.txt         # Active satellites
│   ├── debris.txt         # Orbital debris
│   └── cosmos-critical.txt # Critical debris
├── assets/                 # 3D assets
│   ├── earth/             # Earth textures
│   └── skybox/            # Background images
└── lib/                    # Third-party libraries
    ├── three.min.js       # Three.js 3D library
    └── satellite.min.js   # SGP4 orbital calculations
```

### **Key Algorithms**

#### **Collision Threat Scoring (CTS)**

```javascript
// Distance-based threat assessment
const distance = satellitePosition.distanceTo(debrisPosition);
const threatLevel = calculateThreatLevel(distance, satelliteSize, debrisSize);
```

#### **Orbital Mechanics**

```javascript
// SGP4 propagation for accurate positions
const satellite = satellite.twoline2satrec(tleLine1, tleLine2);
const position = satellite.sgp4(propagationTime);
```

#### **3D Rendering Optimization**

```javascript
// Efficient update throttling
if (frameCount % DEBRIS_UPDATE_INTERVAL === 0) {
  updateDebrisPositions();
}
```

---

## 🌍 NASA Space Apps Challenge

### **Challenge Alignment**

This project directly addresses the **"Commercializing Low Earth Orbit"** challenge category:

- ✅ **Sustainable Commercialization** - Circular economy pathways for debris
- ✅ **Resilient Infrastructure** - Decision support for satellite operators
- ✅ **Regulatory Compliance** - FCC/UN guidelines integration
- ✅ **Business Intelligence** - Transform risk into commercial opportunity
- ✅ **Educational Value** - Historical perspective on space pollution
- ✅ **Accessibility** - Web-based, no installation required
- ✅ **Scalability** - Can handle thousands of objects

### **Impact & Innovation**

- **Business Transformation** - Turns debris risk into commercial decisions
- **Circular Economy** - Enables end-of-life asset monetization
- **Operator Support** - Real-time decision framework for satellite operators
- **Public Awareness** - Makes orbital debris visible and understandable
- **Educational Tool** - Teaches orbital mechanics and space safety
- **Research Platform** - Foundation for advanced debris monitoring
- **Open Source** - Contributes to space community knowledge

---

## 🤝 Contributing

We welcome contributions to improve Xenonite Mission Control!

### **How to Contribute**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**

- Follow existing code style and architecture
- Add comments for complex algorithms
- Test on multiple browsers
- Ensure accessibility compliance
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **NASA** for providing TLE data and orbital mechanics resources
- **NORAD** for satellite tracking data
- **Three.js Community** for the excellent 3D graphics library
- **SGP4/Satellite.js** for orbital propagation algorithms
- **NASA Space Apps Challenge** for inspiring this project

---

## 📞 Contact

**Xenonite Team**

- **Project**: NASA Space Apps Challenge 2025
- **Challenge**: Commercializing Low Earth Orbit
- **Focus**: Sustainable LEO commercialization through debris risk management

---

## 🔮 Future Enhancements

### **Phase 2 Features**

- [ ] **Real-time TLE updates** from NORAD
- [ ] **Advanced collision prediction** algorithms
- [ ] **Multi-satellite tracking** capabilities
- [ ] **Mobile app** version
- [ ] **VR/AR support** for immersive experience

### **Phase 3 Vision**

- [ ] **Machine learning** threat prediction
- [ ] **International collaboration** features
- [ ] **Educational curriculum** integration
- [ ] **API services** for other applications

---

_Built with ❤️ for the NASA Space Apps Challenge 2025_

**🛰️ Making Space Safer, One Orbit at a Time 🛰️**
