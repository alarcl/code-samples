package main

import (
	"os"
	"flag"
	"path/filepath"
	"github.com/fogleman/gg"
	unicreator "github.com/unidoc/unidoc/pdf/creator"
	unipdfmodel "github.com/unidoc/unidoc/pdf/model"
)

/**
 * Флаги
 */
var noSign = flag.Bool("nosign", false, "штамп без подписи") // stamp without sign

var inPdf = flag.String("i", "in.pdf", "входящий pdf") // in pdf
var outPdf = flag.String("o", "out.pdf", "исходящий pdf") // out pdf

// var hPos = flag.String("h", "right", "расположение по горизонтали: left, right") // horisontal pos
// var vPos = flag.String("v", "bottom", "расположение по вертикали: top, center, bottom") // vertical pos
var vPos = flag.Int("pos", 0, "расположение по вертикали (от 0 до 5)")  // vertical pos (0-5)

var numProj = flag.String("np", "", "номер проекта") // project id
var numShed = flag.String("ns", "", "пункт графика") // schedule id
var numDoc = flag.String("nd", "", "номер документа") // doc id
var comment = flag.String("cc", "", "комментарий") // comment
var dateDecision = flag.String("dd", "", "дата решения") // decision date
var dateSend = flag.String("ds", "", "дата отправки") // send date
var whoSend = flag.String("ws", "", "отправитель") // sender
var whomSend = flag.String("wms", "", "получатель") // receiver


func main() {
	flag.Parse()

	exe, err := os.Executable()
	if err != nil {
		panic(err)
	}
	exeDir := filepath.Dir(exe)

	stampFileName := "stamp.png"
	if *noSign {
		stampFileName = "stamp_nosign.png"
	}
	stamp, err := gg.LoadPNG(filepath.Join(exeDir, stampFileName))
	if err != nil {
		panic(err)
	}

	dc := gg.NewContextForImage(stamp)

	dc.SetRGB255(0, 0, 0)
	if err := dc.LoadFontFace(filepath.Join(exeDir, "arialbd.ttf"), 16); err != nil {
		panic(err)
	}
	dc.DrawString(*numDoc, 200, 160)

	dc.SetRGB255(0, 0, 255)
	if err := dc.LoadFontFace(filepath.Join(exeDir, "arialbd.ttf"), 14); err != nil {
		panic(err)
	}

	dc.DrawString(*numProj, 80, 45)
	dc.DrawString(*numShed, 129, 64)
	dc.DrawString(*numDoc, 200, 84)

	dc.DrawString(*comment, 113, 123)
	dc.DrawString(*dateDecision, 16, 161)

	dc.DrawString(*dateSend, 106, 201)
	dc.DrawString(*whoSend, 114, 219)
	dc.DrawString(*whomSend, 106, 236)


	goimg := dc.Image()

	uc := unicreator.New()

	uimg, err := unicreator.NewImageFromGoImage(goimg)
	if err != nil {
		panic(err)
	}

	fileInPdf, err := os.Open(*inPdf)
	if err != nil {
		panic(err)
	}
	defer fileInPdf.Close()

	pdfReader, err := unipdfmodel.NewPdfReader(fileInPdf)
	if err != nil {
		panic(err)
	}

	numPages, err := pdfReader.GetNumPages()
	if err != nil {
		panic(err)
	}

	for i := 1; i <= numPages; i++ {
		page, err := pdfReader.GetPage(i)
		if err != nil {
			panic(err)
		}

		if err = uc.AddPage(page); err != nil {
			panic(err)
		}

		if i != 1 {
			continue
		}

		// поворачиваем штамп если это нужно
		// rotate stamp if needed
		if *page.Rotate != 0 {
			uimg.SetAngle(float64(*page.Rotate))
		}

		// получаем размеры страницы
		// get page size
		mBox, err := page.GetMediaBox()
		if err != nil {
			panic(err)
		}
		pageWidth := mBox.Urx - mBox.Llx
		pageHeight := mBox.Ury - mBox.Lly
		if *page.Rotate != 0 && (*page.Rotate/90)%2 != 0 {
			pageWidth, pageHeight = pageHeight, pageWidth
		}

		// высоту штампа устанавливаем в 1/6 от страницы
		// stamp height set to 1/6 of page
		stampHeight := pageHeight/6
		uimg.ScaleToHeight(stampHeight)
		stampWidth := uimg.Width()

		// устанавливаем расположение штампа
		// set coords of the stamp
		var x, y float64
		x = pageWidth - stampWidth
		y = float64(*vPos) * stampHeight

		switch {
		case (*page.Rotate/90)%4 == 1: // 90 deg
			x = pageWidth - x
			x, y = y, x
		case (*page.Rotate/90)%4 == 2: // 180 deg
			x = pageWidth - x
			y = pageHeight - y
		case (*page.Rotate/90)%4 == 3: // 270 deg
			y = pageHeight - y
			x, y = y, x
		}
		uimg.SetPos(x, y)

		if err = uc.Draw(uimg); err != nil {
			panic(err)
		}
	}

	if err = uc.WriteToFile(*outPdf); err != nil {
		panic(err)
	}
}
