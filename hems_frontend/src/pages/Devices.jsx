import { useState, useEffect, useCallback } from 'react'
import { Fan, AirVent, Lightbulb, Monitor, Cpu, Trash2, Table as TableIcon, LayoutGrid, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import BulkDeviceUpload from '@/components/BulkDeviceUpload'
import { deviceService, brandService, buildingService, roomService, categoryService } from '../services/api'

const deviceIcons = {
    FAN: Fan, AC: AirVent, LIGHT: Lightbulb, PC: Monitor, ELECTRONICS: Monitor, OTHER: Cpu,
}

const AddItemDialog = ({ title, onSave }) => {
    const [value, setValue] = useState('')
    const [open, setOpen] = useState(false)
    const handleSave = async () => {
        if (!value) return
        await onSave(value)
        setOpen(false)
        setValue('')
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size='icon' variant='outline' type='button'><Plus className='h-4 w-4' /></Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <div className='flex gap-2 py-4'>
                    <Input value={value} onChange={e => setValue(e.target.value)} placeholder='Name' />
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function Devices() {
    const [devices, setDevices] = useState([])
    const [metadata, setMetadata] = useState({ buildings: [], rooms: [], brands: [], types: [], categories: [] })
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState('table')
    const [showForm, setShowForm] = useState(false)

    const [filters, setFilters] = useState({ search: '', building: 'all', room: 'all', brand: 'all', device_type: 'all' })
    const [formData, setFormData] = useState({
        name: '', device_type: 'FAN', category: '', brand: '', building: '', room: '', quantity: 1, watt_rating: 0, star_rating: '', ton: ''
    })

    const fetchMetadata = async () => {
        try {
            const response = await deviceService.getMetadata()
            setMetadata(response.data)
        } catch (err) { console.error('Failed to load metadata', err) }
    }

    const fetchDevices = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true)
            const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== 'all' && v !== ''))
            const response = await deviceService.getAll(params)
            setDevices(response.data.results || response.data)
        } catch (err) { console.error(err) } finally { if (!isBackground) setLoading(false) }
    }, [filters])

    useEffect(() => { fetchMetadata(); fetchDevices() }, [fetchDevices])

    const handleAddBrand = async (name) => {
        try {
            console.log("Creating brand:", name)
            const res = await brandService.create({ name })
            console.log("Brand created:", res.data)
            setMetadata(prev => ({ ...prev, brands: [...prev.brands, res.data] }))
            setFormData(prev => ({ ...prev, brand: res.data.id.toString() }))
        } catch (e) {
            console.error("Brand creation failed:", e)
            alert('Failed to add brand: ' + (e.response?.data?.detail || e.message))
        }
    }

    const handleAddCategory = async (name) => {
        try {
            const res = await categoryService.create({ name })
            setMetadata(prev => ({ ...prev, categories: [...prev.categories, res.data] }))
            setFormData(prev => ({ ...prev, category: res.data.id.toString() }))
        } catch (e) { alert('Failed to add category') }
    }

    const handleAddBuilding = async (name) => {
        try {
            const res = await buildingService.create({ name })
            setMetadata(prev => ({ ...prev, buildings: [...prev.buildings, res.data] }))
            setFormData(prev => ({ ...prev, building: res.data.id.toString() }))
        } catch (e) { alert('Failed to add building') }
    }

    const handleAddRoom = async (name) => {
        if (!formData.building) return alert('Select a building first')
        try {
            const res = await roomService.create({ name, building: formData.building })
            setMetadata(prev => ({ ...prev, rooms: [...prev.rooms, res.data] }))
            setFormData(prev => ({ ...prev, room: res.data.id.toString() }))
        } catch (e) { alert('Failed to add room') }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await deviceService.create(formData)
            setShowForm(false)
            fetchDevices(true)
            setFormData({ name: '', device_type: 'FAN', category: '', brand: '', building: '', room: '', quantity: 1, watt_rating: 0, star_rating: '', ton: '' })
        } catch (e) { alert('Error creating device') }
    }

    const filteredRooms = metadata.rooms.filter(r => r.building.toString() === formData.building)

    return (
        <div className='max-w-7xl mx-auto py-8 space-y-6'>
            <div className='flex justify-between items-center'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Devices Management</h1>
                    <p className='text-gray-500 dark:text-gray-400'>Manage campus devices and inventory.</p>
                </div>
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogTrigger asChild><Button>+ Add Device</Button></DialogTrigger>
                    <DialogContent className='max-w-2xl'>
                        <DialogHeader><DialogTitle>Add New Device</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className='grid grid-cols-2 gap-4 py-4'>
                            <div className='col-span-1 space-y-2'>
                                <Label>Device Name</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder='e.g. Ceiling Fan' />
                            </div>
                            <div className='col-span-1 space-y-2'>
                                <Label>Type</Label>
                                <div className='relative'>
                                    <Input
                                        list="device-types"
                                        value={formData.device_type}
                                        onChange={e => setFormData({ ...formData, device_type: e.target.value.toUpperCase() })}
                                        placeholder='e.g. AC'
                                    />
                                    <datalist id="device-types">
                                        {metadata.types?.map(([v, l]) => <option key={v} value={v} />)}
                                    </datalist>
                                </div>
                            </div>

                            <div className='col-span-1 space-y-2'>
                                <Label>Brand</Label>
                                <div className='flex gap-2'>
                                    <Select value={formData.brand} onValueChange={v => setFormData({ ...formData, brand: v })}>
                                        <SelectTrigger className='flex-1'><SelectValue placeholder='Select Brand' /></SelectTrigger>
                                        <SelectContent>{metadata.brands?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <AddItemDialog title='Add Brand' onSave={handleAddBrand} />
                                </div>
                            </div>

                            <div className='col-span-1 space-y-2'>
                                <Label>Category</Label>
                                <div className='flex gap-2'>
                                    <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                        <SelectTrigger className='flex-1'><SelectValue placeholder='Select Category' /></SelectTrigger>
                                        <SelectContent>{metadata.categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <AddItemDialog title='Add Category' onSave={handleAddCategory} />
                                </div>
                            </div>

                            <div className='col-span-1 space-y-2'>
                                <Label>Quantity</Label>
                                <Input type='number' min='1' value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            </div>

                            <div className='col-span-1 space-y-2'>
                                <Label>Building</Label>
                                <div className='flex gap-2'>
                                    <Select value={formData.building} onValueChange={v => setFormData({ ...formData, building: v })}>
                                        <SelectTrigger className='flex-1'><SelectValue placeholder='Select Building' /></SelectTrigger>
                                        <SelectContent>{metadata.buildings?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <AddItemDialog title='Add Building' onSave={handleAddBuilding} />
                                </div>
                            </div>

                            <div className='col-span-1 space-y-2'>
                                <Label>Room</Label>
                                <div className='flex gap-2'>
                                    <Select value={formData.room} onValueChange={v => setFormData({ ...formData, room: v })} disabled={!formData.building}>
                                        <SelectTrigger className='flex-1'><SelectValue placeholder='Select Room' /></SelectTrigger>
                                        <SelectContent>{filteredRooms?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <AddItemDialog title='Add Room' onSave={handleAddRoom} />
                                </div>
                            </div>

                            <div className='col-span-1 space-y-2'>
                                <Label>Wattage (W)</Label>
                                <Input type='number' value={formData.watt_rating} onChange={e => setFormData({ ...formData, watt_rating: e.target.value })} />
                            </div>

                            {(formData.device_type?.toUpperCase() === 'AC' || formData.device_type?.toUpperCase().includes('AC')) && (
                                <>
                                    <div className='col-span-1 space-y-2'>
                                        <Label>Ton</Label>
                                        <Input type='number' step='0.1' value={formData.ton} onChange={e => setFormData({ ...formData, ton: e.target.value })} />
                                    </div>
                                    <div className='col-span-1 space-y-2'>
                                        <Label>Star Rating</Label>
                                        <Input type='number' max='5' value={formData.star_rating} onChange={e => setFormData({ ...formData, star_rating: e.target.value })} />
                                    </div>
                                </>
                            )}

                            <Button type='submit' className='col-span-2 mt-4'>Save Device</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="dark:bg-black/40 dark:border-white/10">
                <CardContent className='pt-6 grid grid-cols-1 md:grid-cols-5 gap-4'>
                    <div className='relative'>
                        <Search className='absolute left-2 top-2.5 h-4 w-4 text-gray-400' />
                        <Input placeholder='Search...' className='pl-8' value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
                    </div>
                    <Select value={filters.device_type} onValueChange={v => setFilters({ ...filters, device_type: v })}>
                        <SelectTrigger><SelectValue placeholder='Type' /></SelectTrigger>
                        <SelectContent><SelectItem value='all'>All Types</SelectItem>{metadata.types?.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={filters.building} onValueChange={v => setFilters({ ...filters, building: v })}>
                        <SelectTrigger><SelectValue placeholder='Building' /></SelectTrigger>
                        <SelectContent><SelectItem value='all'>All Buildings</SelectItem>{metadata.buildings?.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className='flex gap-2'>
                        <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size='icon' onClick={() => setViewMode('grid')}><LayoutGrid className='h-4 w-4' /></Button>
                        <Button variant={viewMode === 'table' ? 'default' : 'outline'} size='icon' onClick={() => setViewMode('table')}><TableIcon className='h-4 w-4' /></Button>
                    </div>
                </CardContent>
            </Card>

            <BulkDeviceUpload onUploadComplete={() => fetchDevices(true)} />

            {loading ? <div className='text-center py-10 text-gray-500 dark:text-gray-400'>Loading...</div> : (
                viewMode === 'table' ? (
                    <div className='border dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-black/40'>
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:border-white/10">
                                    <TableHead className="dark:text-gray-400">Type</TableHead><TableHead className="dark:text-gray-400">Name</TableHead><TableHead className="dark:text-gray-400">Brand</TableHead>
                                    <TableHead className="dark:text-gray-400">Location</TableHead><TableHead className="dark:text-gray-400">Qty</TableHead><TableHead className="dark:text-gray-400">Specs</TableHead>
                                    <TableHead className='text-right dark:text-gray-400'>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices.map(dev => {
                                    const Icon = deviceIcons[dev.device_type?.toUpperCase()] || deviceIcons.OTHER
                                    return (
                                        <TableRow key={dev.id} className="dark:border-white/10">
                                            <TableCell><Icon className='h-4 w-4 text-gray-500 dark:text-gray-400' /></TableCell>
                                            <TableCell className='font-medium dark:text-gray-200'>{dev.name || dev.device_type}</TableCell>
                                            <TableCell className="dark:text-gray-400">{dev.brand_name || '-'}</TableCell>
                                            <TableCell className="dark:text-gray-400">{dev.building_name} / {dev.room_name}</TableCell>
                                            <TableCell><Badge variant='secondary'>{dev.quantity}</Badge></TableCell>
                                            <TableCell className='text-xs text-gray-500 dark:text-gray-500'>
                                                {dev.watt_rating ? `${dev.watt_rating}W` : ''}
                                                {dev.star_rating ? ` • ${dev.star_rating}⭐` : ''}
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                <Button size='sm' variant='ghost' className='text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' onClick={() => handleDeleteDevice(dev.id)}><Trash2 className='h-4 w-4' /></Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {devices.map(dev => {
                            const Icon = deviceIcons[dev.device_type?.toUpperCase()] || deviceIcons.OTHER
                            return (
                                <Card key={dev.id} className="dark:bg-black/40 dark:border-white/10 dark:text-white"><CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium dark:text-white'>{dev.name || dev.device_type}</CardTitle><Icon className='h-4 w-4 text-muted-foreground' /></CardHeader><CardContent><div className='text-2xl font-bold'>{dev.quantity}</div><p className='text-xs text-muted-foreground'>{dev.building_name} - {dev.room_name}</p><div className='mt-2 flex gap-2'>{dev.brand_name && <Badge variant='outline'>{dev.brand_name}</Badge>}{dev.watt_rating > 0 && <Badge variant='outline'>{dev.watt_rating}W</Badge>}</div></CardContent></Card>
                            )
                        })}
                    </div>
                )
            )}
        </div>
    )
}
