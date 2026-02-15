import { createContext, useContext, useReducer, useCallback } from 'react'

const DeviceContext = createContext()

const initialState = {
  devices: [],
  loading: false,
  error: null,
}

function deviceReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_DEVICES':
      return { ...state, devices: action.payload, loading: false }
    case 'ADD_DEVICE':
      return { ...state, devices: [...state.devices, action.payload] }
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(d =>
          d.id === action.payload.id ? action.payload : d
        ),
      }
    case 'DELETE_DEVICE':
      return {
        ...state,
        devices: state.devices.filter(d => d.id !== action.payload),
      }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    default:
      return state
  }
}

export function DeviceProvider({ children }) {
  const [state, dispatch] = useReducer(deviceReducer, initialState)

  const setLoading = useCallback(
    (loading) => dispatch({ type: 'SET_LOADING', payload: loading }),
    []
  )

  const setDevices = useCallback(
    (devices) => dispatch({ type: 'SET_DEVICES', payload: devices }),
    []
  )

  const addDevice = useCallback(
    (device) => dispatch({ type: 'ADD_DEVICE', payload: device }),
    []
  )

  const updateDevice = useCallback(
    (device) => dispatch({ type: 'UPDATE_DEVICE', payload: device }),
    []
  )

  const deleteDevice = useCallback(
    (id) => dispatch({ type: 'DELETE_DEVICE', payload: id }),
    []
  )

  const setError = useCallback(
    (error) => dispatch({ type: 'SET_ERROR', payload: error }),
    []
  )

  const value = {
    ...state,
    setLoading,
    setDevices,
    addDevice,
    updateDevice,
    deleteDevice,
    setError,
  }

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDeviceContext() {
  const context = useContext(DeviceContext)
  if (!context) {
    throw new Error('useDeviceContext must be used within DeviceProvider')
  }
  return context
}
