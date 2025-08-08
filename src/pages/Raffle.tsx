import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Layout from '../components/Layout';
import Navigation from '../components/Navigation';
import GlassCard from '../components/GlassCard';
import { Trophy, Users, Clock, Play, Settings, Sparkles, Ticket } from 'lucide-react';
import type { Contestant, Winner, DrawType } from '../types';
import { getWinners, addWinner } from '../utils/storage';
import { getAllContestants, drawWinners, getContestantsByDepartment } from '../utils/raffle';

const drawConfigs = [
  {
    id: 'discovery-70' as DrawType,
    name: '70% Discovery',
    description: 'First discovery raffle draw',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'discovery-80' as DrawType,
    name: '80% Discovery',
    description: 'Second discovery raffle draw',
    color: 'from-purple-500 to-pink-600'
  }
];
export const Raffle: React.FC = () => {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinners, setCurrentWinners] = useState<Contestant[]>([]);
  const [numberOfWinners, setNumberOfWinners] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<DrawType>('discovery-70');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'International Messaging' | 'India Messaging' | 'APAC'>('all');
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'shaking' | 'picking' | 'revealing'>('idle');
  const [floatingChits, setFloatingChits] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    const allContestants = getAllContestants(selectedDraw);
    if (departmentFilter === 'all') {
      setContestants(allContestants);
    } else {
      setContestants(getContestantsByDepartment(departmentFilter, selectedDraw));
    }
    setWinners(getWinners(selectedDraw));
  }, [selectedDraw, departmentFilter]);

  const triggerConfetti = () => {
    // Main confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Side confetti bursts
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 200);

    // Continuous rain effect
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleDraw = async () => {
    const existingWinnerNames = winners.filter(w => w.drawType === selectedDraw).map(w => w.name);
    const eligibleContestants = contestants.filter(c => !existingWinnerNames.includes(c.name));
    
    if (eligibleContestants.length === 0) return;

    const actualWinnerCount = Math.min(numberOfWinners, eligibleContestants.length);
    
    setIsDrawing(true);
    setCurrentWinners([]);
    setAnimationPhase('shaking');

    // Generate floating chits for animation
    const chits = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5
    }));
    setFloatingChits(chits);

    // Shaking animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAnimationPhase('picking');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Draw winners
    const selectedWinners = drawWinners(eligibleContestants, actualWinnerCount, existingWinnerNames);
    
    setAnimationPhase('revealing');
    
    // Trigger confetti when revealing winners
    triggerConfetti();
    
    // Reveal winners one by one
    for (let i = 0; i < selectedWinners.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentWinners(prev => [...prev, selectedWinners[i]]);
      
      // Additional confetti burst for each winner
      if (i > 0) {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 }
        });
      }
      
      // Add winner to storage
      const newWinner = addWinner(selectedWinners[i], selectedDraw);
      setWinners(prev => [...prev, newWinner]);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsDrawing(false);
    setAnimationPhase('idle');
    setFloatingChits([]);
  };

  const existingWinnerNames = winners.filter(w => w.drawType === selectedDraw).map(w => w.name);
  const eligibleContestants = contestants.filter(c => !existingWinnerNames.includes(c.name));
  const maxWinners = Math.min(10, eligibleContestants.length);
  const currentDrawConfig = drawConfigs.find(d => d.id === selectedDraw)!;
  const totalTickets = eligibleContestants.reduce((sum, c) => sum + c.tickets, 0);

  return (
    <Layout title="Raffle Draw">
      <Navigation />
      
      <div className="space-y-8">
        {/* Draw Selection */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Select Draw Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drawConfigs.map((config) => (
              <motion.button
                key={config.id}
                onClick={() => setSelectedDraw(config.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedDraw === config.id
                    ? 'border-white/50 bg-white/20'
                    : 'border-white/20 bg-white/10 hover:bg-white/15'
                }`}
              >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center`}>
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{config.name}</h4>
                <p className="text-white/70 text-sm mb-3">{config.description}</p>
                <div className="text-white/60 text-xs">
                  {getAllContestants(config.id).length} contestants • {getWinners(config.id).length} winners
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GlassCard className="p-6" hover>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white/80 text-sm font-medium">Total Contestants</h3>
                <p className="text-3xl font-bold text-white mt-1">{contestants.length}</p>
                <p className="text-white/60 text-xs mt-1">{currentDrawConfig.name}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20 backdrop-blur-md">
                <Users className="w-6 h-6 text-blue-300" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white/80 text-sm font-medium">Eligible</h3>
                <p className="text-3xl font-bold text-white mt-1">{eligibleContestants.length}</p>
                <p className="text-white/60 text-xs mt-1">Available for draw</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20 backdrop-blur-md">
                <Clock className="w-6 h-6 text-green-300" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white/80 text-sm font-medium">Total Tickets</h3>
                <p className="text-3xl font-bold text-white mt-1">{totalTickets}</p>
                <p className="text-white/60 text-xs mt-1">In eligible pool</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/20 backdrop-blur-md">
                <Ticket className="w-6 h-6 text-orange-300" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white/80 text-sm font-medium">To Draw</h3>
                <p className="text-3xl font-bold text-white mt-1">{numberOfWinners}</p>
                <p className="text-white/60 text-xs mt-1">Winners to select</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20 backdrop-blur-md">
                <Sparkles className="w-6 h-6 text-purple-300" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main Drawing Area */}
        <GlassCard className="p-8">
          <div className="text-center space-y-8">
            {/* Jar Animation Container */}
            <div className="relative mx-auto w-80 h-80 mb-8">
              {/* Jar SVG */}
              <div className="relative w-full h-full">
                <svg viewBox="0 0 200 240" className="w-full h-full">
                  {/* Jar Body */}
                  <path
                    d="M40 60 L40 200 Q40 220 60 220 L140 220 Q160 220 160 200 L160 60 Z"
                    fill="rgba(255, 255, 255, 0.1)"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="2"
                  />
                  {/* Jar Neck */}
                  <rect
                    x="70"
                    y="40"
                    width="60"
                    height="25"
                    fill="rgba(255, 255, 255, 0.1)"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="2"
                    rx="5"
                  />
                  {/* Jar Lid */}
                  <rect
                    x="65"
                    y="35"
                    width="70"
                    height="10"
                    fill="rgba(255, 255, 255, 0.2)"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="2"
                    rx="5"
                  />
                </svg>

                {/* Floating Chits Animation */}
                <AnimatePresence>
                  {floatingChits.map((chit) => (
                    <motion.div
                      key={chit.id}
                      initial={{ 
                        x: `${chit.x}%`, 
                        y: '70%',
                        scale: 0.8,
                        opacity: 0.8
                      }}
                      animate={
                        animationPhase === 'shaking' ? {
                          x: [`${chit.x}%`, `${chit.x + 5}%`, `${chit.x - 5}%`, `${chit.x}%`],
                          y: ['70%', '65%', '75%', '70%'],
                          rotate: [0, 10, -10, 0],
                          transition: {
                            duration: 0.5,
                            repeat: Infinity,
                            delay: chit.delay
                          }
                        } : animationPhase === 'picking' ? {
                          x: '50%',
                          y: '20%',
                          scale: 1.2,
                          opacity: 1,
                          transition: {
                            duration: 1,
                            delay: chit.delay,
                            ease: "easeOut"
                          }
                        } : {}
                      }
                      exit={{ 
                        opacity: 0,
                        scale: 0,
                        transition: { duration: 0.3 }
                      }}
                      className="absolute w-4 h-6 bg-gradient-to-b from-yellow-200 to-yellow-400 rounded-sm shadow-lg transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}
                    />
                  ))}
                </AnimatePresence>

                {/* Jar Shaking Animation */}
                <motion.div
                  animate={
                    animationPhase === 'shaking' ? {
                      rotate: [0, 2, -2, 0],
                      transition: {
                        duration: 0.2,
                        repeat: Infinity
                      }
                    } : {}
                  }
                  className="absolute inset-0 pointer-events-none"
                />
              </div>
            </div>

            {/* Winners Display */}
            <AnimatePresence>
              {currentWinners.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                  className="space-y-4"
                >
                  <motion.h2 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-3xl font-bold text-white mb-6 flex items-center justify-center"
                  >
                    <Trophy className="w-8 h-8 mr-3 text-yellow-400" />
                    {currentWinners.length === 1 ? 'Winner Selected!' : 'Winners Selected!'}
                  </motion.h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {currentWinners.map((winner, index) => (
                      <motion.div
                        key={winner.name}
                        initial={{ opacity: 0, y: 100, scale: 0.5, rotateY: 180 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: 1, 
                          rotateY: 0,
                          transition: {
                            delay: index * 0.3,
                            duration: 0.8,
                            type: "spring",
                            bounce: 0.6
                          }
                        }}
                        whileHover={{ 
                          scale: 1.05, 
                          y: -10,
                          transition: { duration: 0.2 }
                        }}
                        className={`p-6 bg-gradient-to-br ${currentDrawConfig.color}/20 rounded-xl border border-white/30 backdrop-blur-md`}
                      >
                        {/* Sparkle effects */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.2, 1] }}
                          transition={{ delay: index * 0.3 + 0.5, duration: 0.6 }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"
                        >
                          <Sparkles className="w-4 h-4 text-white" />
                        </motion.div>
                        
                        <div className="text-center">
                          <motion.div 
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: index * 0.3 + 0.2, duration: 0.5, type: "spring" }}
                            className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r ${currentDrawConfig.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                          >
                            {index + 1}
                          </motion.div>
                          <motion.h3 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.3 + 0.4 }}
                            className="text-xl font-bold text-white mb-2"
                          >
                            {winner.name}
                          </motion.h3>
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.3 + 0.5 }}
                            className="text-white/80 text-sm mb-1"
                          >
                            {winner.department}
                          </motion.p>
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.3 + 0.6 }}
                            className="text-white/60 text-xs mb-2"
                          >
                            Supervisor: {winner.supervisor}
                          </motion.p>
                          <div className="flex items-center justify-center space-x-1">
                            <Ticket className="w-4 h-4 text-yellow-400" />
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.3 + 0.7, type: "spring", bounce: 0.5 }}
                              className="text-yellow-400 font-bold"
                            >
                              {winner.tickets} tickets
                            </motion.span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drawing Status */}
            {isDrawing && currentWinners.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center space-x-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
                  />
                  <motion.h2 
                    animate={{ 
                      scale: [1, 1.05, 1],
                      textShadow: [
                        "0 0 0px rgba(255,255,255,0)",
                        "0 0 20px rgba(255,255,255,0.5)",
                        "0 0 0px rgba(255,255,255,0)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-2xl font-bold text-white"
                  >
                    {animationPhase === 'shaking' && 'Shaking the jar...'}
                    {animationPhase === 'picking' && 'Picking winners...'}
                    {animationPhase === 'revealing' && 'Revealing winners...'}
                  </motion.h2>
                </div>
                <motion.p 
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-white/70"
                >
                  {animationPhase === 'shaking' && 'Mixing up all the contestant chits'}
                  {animationPhase === 'picking' && `Selecting ${numberOfWinners} winner${numberOfWinners > 1 ? 's' : ''} from the jar`}
                  {animationPhase === 'revealing' && 'Announcing the lucky winners'}
                </motion.p>
              </motion.div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => setShowSettings(!showSettings)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </motion.button>

              <motion.button
                onClick={handleDraw}
                disabled={isDrawing || eligibleContestants.length === 0}
                whileHover={{ 
                  scale: isDrawing ? 1 : 1.05,
                  boxShadow: isDrawing ? "none" : "0 10px 30px rgba(0,0,0,0.3)"
                }}
                whileTap={{ scale: isDrawing ? 1 : 0.95 }}
                animate={isDrawing ? {
                  background: [
                    `linear-gradient(45deg, ${currentDrawConfig.color.split(' ')[1]}, ${currentDrawConfig.color.split(' ')[3]})`,
                    `linear-gradient(45deg, ${currentDrawConfig.color.split(' ')[3]}, ${currentDrawConfig.color.split(' ')[1]})`,
                    `linear-gradient(45deg, ${currentDrawConfig.color.split(' ')[1]}, ${currentDrawConfig.color.split(' ')[3]})`
                  ]
                } : {}}
                transition={isDrawing ? { duration: 2, repeat: Infinity } : {}}
                className={`flex items-center space-x-2 px-8 py-4 rounded-lg bg-gradient-to-r ${currentDrawConfig.color} text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg`}
              >
                <motion.div
                  animate={isDrawing ? { rotate: 360 } : {}}
                  transition={isDrawing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                >
                  <Play className="w-5 h-5" />
                </motion.div>
                <span>
                  {isDrawing 
                    ? 'Drawing...' 
                    : eligibleContestants.length === 0 
                      ? 'No Eligible Contestants' 
                      : `Draw ${numberOfWinners} Winner${numberOfWinners > 1 ? 's' : ''} (${currentDrawConfig.name})`
                  }
                </span>
              </motion.button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <GlassCard className="p-6 max-w-md mx-auto">
                    <h3 className="text-lg font-semibold text-white mb-4">Draw Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Number of Winners to Draw
                        </label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="range"
                            min="1"
                            max={maxWinners}
                            value={numberOfWinners}
                            onChange={(e) => setNumberOfWinners(parseInt(e.target.value))}
                            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                            disabled={isDrawing}
                          />
                          <span className="text-white font-bold text-lg min-w-[2rem] text-center">
                            {numberOfWinners}
                          </span>
                        </div>
                        <p className="text-white/60 text-xs mt-2">
                          Maximum: {maxWinners} (based on eligible contestants)
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-3">
                          Department Filter
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'all', label: 'All Departments' },
                            { value: 'International Messaging', label: 'International Messaging' },
                            { value: 'India Messaging', label: 'India Messaging' },
                            { value: 'APAC', label: 'APAC' }
                          ].map((option) => (
                            <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name="departmentFilter"
                                value={option.value}
                                checked={departmentFilter === option.value}
                                onChange={(e) => setDepartmentFilter(e.target.value as any)}
                                disabled={isDrawing}
                                className="w-4 h-4 text-blue-500 bg-white/20 border-white/30 focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-white/80 text-sm">{option.label}</span>
                              <span className="text-white/60 text-xs">
                                ({option.value === 'all' 
                                  ? getAllContestants(selectedDraw).length 
                                  : getContestantsByDepartment(option.value as any, selectedDraw).length} contestants)
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {eligibleContestants.length === 0 && contestants.length > 0 && (
              <p className="text-white/60 text-sm">
                All contestants have already won. Great job completing the raffle!
              </p>
            )}
          </div>
        </GlassCard>

        {/* Eligible Contestants */}
        {eligibleContestants.length > 0 && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Eligible Contestants for {currentDrawConfig.name}
              {departmentFilter !== 'all' && ` - ${departmentFilter}`} ({eligibleContestants.length})
            </h3>
            <div className="mb-4 p-4 bg-white/10 rounded-lg">
              <p className="text-white/80 text-sm">
                <strong>Ticket-based probability:</strong> Contestants with more tickets have higher chances of winning.
                {departmentFilter !== 'all' && (
                  <span className="block mt-1">
                    <strong>Department filter:</strong> Only showing contestants from {departmentFilter}
                  </span>
                )}
                Total tickets in pool: <span className="text-yellow-400 font-bold">{totalTickets}</span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {eligibleContestants.map((contestant) => (
                <motion.div
                  key={contestant.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/15 transition-all duration-200"
                >
                  <h4 className="font-semibold text-white mb-1">{contestant.name}</h4>
                  <p className="text-white/70 text-sm mb-1">{contestant.department}</p>
                  <p className="text-white/50 text-xs mb-2">Supervisor: {contestant.supervisor}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Ticket className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-sm">{contestant.tickets}</span>
                    </div>
                    <span className="text-white/60 text-xs">
                      {Math.round((contestant.tickets / totalTickets) * 100)}% chance
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #10b981, #059669);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #10b981, #059669);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      `}</style>
    </Layout>
  );
};