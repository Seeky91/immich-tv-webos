import React, {useEffect, useRef} from 'react';
import qrcode from 'qrcode-generator';

interface QrCodeProps {
	value: string;
	className?: string;
}

// Modules of white margin around the code — scanners need this to lock on,
// especially from a couch-distance photo of a TV panel.
const QUIET_ZONE_MODULES = 3;
const MODULE_PX = 12;

export const QrCode: React.FC<QrCodeProps> = ({value, className}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const qr = qrcode(0, 'M');
		qr.addData(value);
		qr.make();
		const modules = qr.getModuleCount();
		const size = (modules + QUIET_ZONE_MODULES * 2) * MODULE_PX;
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, size, size);
		ctx.fillStyle = '#0f172a';
		for (let row = 0; row < modules; row++) {
			for (let col = 0; col < modules; col++) {
				if (qr.isDark(row, col)) {
					ctx.fillRect((col + QUIET_ZONE_MODULES) * MODULE_PX, (row + QUIET_ZONE_MODULES) * MODULE_PX, MODULE_PX, MODULE_PX);
				}
			}
		}
	}, [value]);

	return <canvas ref={canvasRef} className={className} />;
};
